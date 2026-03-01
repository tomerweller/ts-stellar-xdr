import * as StellarBase from '@stellar/stellar-base-comp';
import { use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

use(chaiAsPromised);

(globalThis as any).StellarBase = StellarBase;
