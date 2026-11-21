// Gebruik: node --import ./scripts/lib/threemock_register.mjs <test>   (zet het loader-hook voor de three-mock aan; zie scripts/lib/threemock.mjs)
import { register } from 'node:module';
register('./threemock_loader.mjs', import.meta.url);
