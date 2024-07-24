import { decodeDobBySporeId } from '@spore-sdk/dob';

(async function main() {
  const sporeId = '0x6369e30ab82a8f1af8d16ea5b856630cbfa28a45ac9a4906eab5ac15dd68107f';
  const dobServerUrl = 'http://127.0.0.1:8090';
  const result = await decodeDobBySporeId(sporeId, dobServerUrl);
  console.log(result);
})();
