import cloneDeep from 'lodash/cloneDeep';
import { helpers } from '@ckb-lumos/lumos';
import { Config } from '@ckb-lumos/config-manager';
import { Address, Script, values } from '@ckb-lumos/base';
import { FromInfo, parseFromInfo } from '@ckb-lumos/common-scripts';
import { ScriptId } from '../types';

/**
 * Compare two scripts to see if they are identical.
 */
export function isScriptValueEquals(a: Script, b: Script) {
  return new values.ScriptValue(a).equals(new values.ScriptValue(b));
}

/**
 * Compare two scripts to see if their 'codeHash' and 'hashType' are the same.
 */
export function isScriptIdEquals(a: ScriptId, b: ScriptId) {
  return a.codeHash === b.codeHash && a.hashType === b.hashType;
}

/**
 * Get change lock of a transaction.
 */
export function getChangeLock(fromInfos: FromInfo[], changeAddress?: Address, config?: Config): Script {
  const firstFromInfo = parseFromInfo(fromInfos[0], { config });
  const changeAddressLock = changeAddress ? helpers.parseAddress(changeAddress, { config }) : void 0;

  return changeAddressLock ?? firstFromInfo.fromScript;
}

/**
 * Assemble locks of Transaction.inputs.
 */
export function composeInputLocks(props: { fromInfos: FromInfo[]; inputLocks?: Script[]; config?: Config }): Script[] {
  const config = props.config;
  const inputLocks = Array.isArray(props.inputLocks) ? cloneDeep(props.inputLocks) : [];

  const fromInfoLocks = props.fromInfos.map((fromInfo) => {
    return parseFromInfo(fromInfo, { config }).fromScript;
  });

  return [...inputLocks, ...fromInfoLocks];
}

/**
 * Assemble possible locks of Transaction.outputs.
 */
export function composeOutputLocks(props: {
  fromInfos: FromInfo[];
  outputLocks?: Script[];
  changeAddress?: Address;
  config?: Config;
}): Script[] {
  const config = props.config;
  const outputLocks = Array.isArray(props.outputLocks) ? cloneDeep(props.outputLocks) : [];

  let changeLock: Script;
  if (props.changeAddress) {
    changeLock = helpers.parseAddress(props.changeAddress, { config });
  } else {
    changeLock = parseFromInfo(props.fromInfos[0], { config }).fromScript;
  }

  const foundIndex = outputLocks.findIndex((script) => isScriptValueEquals(script, changeLock));
  if (foundIndex < 0) {
    outputLocks.push(changeLock);
  }

  return outputLocks;
}
