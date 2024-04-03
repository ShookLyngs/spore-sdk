import { Address } from '@ckb-lumos/base';
import { helpers } from '@ckb-lumos/lumos';
import { Config } from '@ckb-lumos/config-manager';
import { FromInfo, parseFromInfo } from '@ckb-lumos/common-scripts';

/**
 * Check if the target address is valid.
 */
export function isAddressValid(address: Address, config?: Config) {
  try {
    helpers.parseAddress(address, { config });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a FromInfo to a CKB address.
 */
export function fromInfoToAddress(fromInfo: FromInfo, config?: Config): Address {
  if (typeof fromInfo === 'string' && isAddressValid(fromInfo)) {
    return fromInfo as Address;
  }

  const parsed = parseFromInfo(fromInfo, { config });
  return helpers.encodeToAddress(parsed.fromScript, { config });
}
