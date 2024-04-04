import { helpers } from '@ckb-lumos/lumos';
/**
 * 合并两个对象中的特定数组属性，并去重。
 *
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 * @param keys 需要合并和去重的属性名数组
 * @returns 返回合并后的新对象
 */
function mergeObjectsWithUniqueArrays(
  obj1: helpers.TransactionSkeletonType,
  obj2: helpers.TransactionSkeletonType,
): helpers.TransactionSkeletonType {
  let keys = [
    'inputs',
    'outputs',
    'cellDeps',
    'headerDeps',
    'witnesses',
    'fixedEntries',
    'signingEntries',
    'inputSinces',
  ];
  const result: helpers.TransactionSkeletonType = { ...obj1 };

  keys.forEach((key: string) => {
    const array1 = Array.isArray(obj1[key]) ? obj1[key] : [];
    const array2 = Array.isArray(obj2[key]) ? obj2[key] : [];
    const mergedArray = [...array1, ...array2];
    const uniqueArray = Array.from(new Set(mergedArray.map((item) => JSON.stringify(item)))).map((str) =>
      JSON.parse(str),
    );
    result[key] = uniqueArray;
  });

  return result;
}
