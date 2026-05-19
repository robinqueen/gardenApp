// Rendered POLYGON Farm Pack icons — one PNG per produce type.
// Vite hashes the filenames at build time via ?url imports.

import tomato      from '../assets/icons/seeds/tomato.png?url';
import pepper      from '../assets/icons/seeds/pepper.png?url';
import chilli      from '../assets/icons/seeds/chilli.png?url';
import eggplant    from '../assets/icons/seeds/eggplant.png?url';
import cucumber    from '../assets/icons/seeds/cucumber.png?url';
import pumpkin     from '../assets/icons/seeds/pumpkin.png?url';
import squash      from '../assets/icons/seeds/squash.png?url';
import bean        from '../assets/icons/seeds/bean.png?url';
import lettuce     from '../assets/icons/seeds/lettuce.png?url';
import cabbage     from '../assets/icons/seeds/cabbage.png?url';
import broccoli    from '../assets/icons/seeds/broccoli.png?url';
import carrot      from '../assets/icons/seeds/carrot.png?url';
import beet        from '../assets/icons/seeds/beet.png?url';
import onion       from '../assets/icons/seeds/onion.png?url';
import corn        from '../assets/icons/seeds/corn.png?url';
import potato      from '../assets/icons/seeds/potato.png?url';
import watermelon  from '../assets/icons/seeds/watermelon.png?url';
import strawberry  from '../assets/icons/seeds/strawberry.png?url';
import sunflower   from '../assets/icons/seeds/sunflower.png?url';
import asparagus   from '../assets/icons/seeds/asparagus.png?url';
import apple       from '../assets/icons/seeds/apple.png?url';
import lemon       from '../assets/icons/seeds/lemon.png?url';
import orange      from '../assets/icons/seeds/orange.png?url';
import cherry      from '../assets/icons/seeds/cherry.png?url';
import peach       from '../assets/icons/seeds/peach.png?url';
import pear        from '../assets/icons/seeds/pear.png?url';
import plum        from '../assets/icons/seeds/plum.png?url';
import apricot     from '../assets/icons/seeds/apricot.png?url';
import herb        from '../assets/icons/seeds/herb.png?url';
import wheat       from '../assets/icons/seeds/wheat.png?url';
import seed        from '../assets/icons/seeds/seed.png?url';

// Maps seed ID prefixes/exact IDs to a POLYGON icon URL.
// Checked in order — first match wins.
const SEED_ICON_RULES: [string | string[], string][] = [
  // Tomato
  ['tomato', tomato],
  // Peppers — hot varieties get chilli model
  [['pepper-jalapeno', 'pepper-cayenne', 'pepper-shishito', 'pepper-poblano'], chilli],
  ['pepper', pepper],
  // Nightshades
  ['eggplant', eggplant],
  // Cucurbits
  ['cucumber', cucumber],
  [['pumpkin', 'squash-sugar-pumpkin'], pumpkin],
  ['watermelon', watermelon],
  ['squash', squash],
  ['melon', squash],
  // Legumes
  [['bean', 'pea', 'kiwi-vine'], bean],
  // Leafy
  ['lettuce', lettuce],
  [['cabbage', 'brussels-sprouts', 'kohlrabi'], cabbage],
  ['broccoli', broccoli],
  ['cauliflower', broccoli],
  // Root
  ['carrot', carrot],
  ['beet', beet],
  ['potato', potato],
  ['radish', herb],
  // Alliums
  [['onion', 'scallion', 'leek', 'garlic', 'shallot', 'chive'], onion],
  // Grain / tall
  ['corn', corn],
  [['wheat', 'hemp'], wheat],
  // Flowers / companion
  ['sunflower', sunflower],
  // Fruit
  ['strawberry', strawberry],
  ['apple', apple],
  ['lemon', lemon],
  ['orange', orange],
  ['cherry', cherry],
  ['peach', peach],
  ['pear', pear],
  ['plum', plum],
  ['apricot', apricot],
  // Veg / herbs catch-alls
  ['asparagus', asparagus],
  [['kale', 'chard', 'collard', 'spinach', 'arugula', 'endive'], herb],
  [['basil', 'cilantro', 'dill', 'parsley', 'oregano', 'thyme', 'sage', 'mint', 'fennel'], herb],
  [['marigold', 'nasturtium', 'borage', 'raspberry', 'blueberry', 'rhubarb'], herb],
];

/** Returns the POLYGON icon URL for a seed ID, or null if none available. */
export function getSeedIconUrl(seedId: string): string | null {
  for (const [key, url] of SEED_ICON_RULES) {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      if (seedId === k || seedId.startsWith(k + '-')) {
        return url;
      }
    }
  }
  // Fall back to generic seed packet for anything unrecognised
  return seed;
}
