import { RenderOutput } from '../helper/object';
import { Axios } from 'axios';
import { getErrorByCode } from '../helper/error';
import { Cell, OutPoint, RPC } from '@ckb-lumos/lumos';

export async function decodeDobBySporeId(sporeId: string, dobServerUrl: string): Promise<RenderOutput> {
  const axios = new Axios({
    baseURL: dobServerUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  const result = await axios.post(
    '/',
    JSON.stringify({
      id: 0,
      jsonrpc: '2.0',
      method: 'dob_decode',
      params: [sporeId.replace(/^0x/, '')],
    }),
  );
  const decoderResult = JSON.parse(result.data);
  if ('error' in decoderResult) {
    const serverError = getErrorByCode(decoderResult.error.code as number);
    throw new Error(`Decode DOB failed: ${serverError}`);
  }
  const renderResult = JSON.parse(decoderResult.result);
  const renderOutput = JSON.parse(renderResult.render_output);
  return renderOutput;
}

export async function decodeDobBySporeCell(sporeCell: Cell, dobServerUrl: string): Promise<RenderOutput> {
  const sporeId = sporeCell.cellOutput.type?.args;
  if (sporeId === undefined) {
    throw new Error('Invalid spore cell: missing spore id');
  }
  return decodeDobBySporeId(sporeId, dobServerUrl);
}

export async function decodeDobBySporeOutpoint(
  sporeOutpoint: OutPoint,
  dobServerUrl: string,
  ckbRpc: RPC,
): Promise<RenderOutput> {
  const liveCell = await ckbRpc.getLiveCell(sporeOutpoint, false);
  const sporeCell: Cell | undefined = liveCell?.cell
    ? {
        cellOutput: liveCell.cell.output,
        data: liveCell.cell.data.content,
      }
    : void 0;
  if (!sporeCell) {
    throw new Error('Invalid spore outpoint: missing spore cell');
  }
  return decodeDobBySporeCell(sporeCell, dobServerUrl);
}
