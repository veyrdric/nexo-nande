import { createHmac } from 'node:crypto';
import { isValidHmacSha256Signature } from './hmac.js';

const SECRET = 'secreto-de-prueba';
const BODY = Buffer.from('{"documents":[]}');
const sign = (body: Buffer, secret = SECRET) =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

describe('isValidHmacSha256Signature', () => {
  it('acepta una firma válida', () => {
    expect(isValidHmacSha256Signature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it('rechaza una firma hecha con otro secreto', () => {
    expect(isValidHmacSha256Signature(BODY, sign(BODY, 'otro'), SECRET)).toBe(false);
  });

  it('rechaza si el cuerpo fue modificado', () => {
    expect(isValidHmacSha256Signature(Buffer.from('{"documents":[1]}'), sign(BODY), SECRET)).toBe(false);
  });

  it('rechaza header ausente, sin prefijo sha256= o con largo inválido', () => {
    expect(isValidHmacSha256Signature(BODY, undefined, SECRET)).toBe(false);
    expect(isValidHmacSha256Signature(BODY, sign(BODY).replace('sha256=', 'md5='), SECRET)).toBe(false);
    expect(isValidHmacSha256Signature(BODY, 'sha256=abc', SECRET)).toBe(false);
  });
});
