using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace GardenApp.Api.Auth;

/// <summary>
/// Loads a 2048-bit RSA private key from a PEM file on disk.
/// If the file does not exist, a new key pair is generated and saved.
///
/// IMPORTANT: The key file must be stored OUTSIDE the repository
/// (e.g. /var/gardenapp/keys/rsa.pem on Unraid). Add it to .gitignore.
/// Losing this key invalidates all outstanding JWTs — back it up.
/// </summary>
public sealed class RsaKeyProvider
{
    public RsaSecurityKey Key { get; }
    public SigningCredentials SigningCredentials { get; }

    public RsaKeyProvider(IConfiguration config, ILogger<RsaKeyProvider> logger)
    {
        var keyPath = config["Auth:RsaKeyPath"]
            ?? throw new InvalidOperationException(
                "Auth:RsaKeyPath is not configured. " +
                "Set it to an absolute path outside the repository, e.g. /var/gardenapp/keys/rsa.pem");

        if (!File.Exists(keyPath))
        {
            logger.LogWarning(
                "RSA key not found at {Path} — generating new 2048-bit key pair. " +
                "Back this file up; losing it will invalidate all existing sessions.",
                keyPath);
            GenerateAndSave(keyPath);
        }

        var pem = File.ReadAllText(keyPath);
        var rsa = RSA.Create();
        rsa.ImportFromPem(pem);

        // RsaSecurityKey holds the full key pair.
        // .NET uses the private half for signing and the public half for validation automatically.
        Key = new RsaSecurityKey(rsa);
        SigningCredentials = new SigningCredentials(Key, SecurityAlgorithms.RsaSha256);
    }

    private static void GenerateAndSave(string path)
    {
        var dir = Path.GetDirectoryName(path);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        using var rsa = RSA.Create(2048);
        // Export as PKCS#1 PEM (private key)
        var pem = rsa.ExportRSAPrivateKeyPem();
        File.WriteAllText(path, pem);

        // On Unix: restrict to owner read/write only (chmod 600)
        if (!OperatingSystem.IsWindows())
            File.SetUnixFileMode(path, UnixFileMode.UserRead | UnixFileMode.UserWrite);
    }
}
