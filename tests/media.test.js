import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { prepareImages, MAX_IMAGE_BYTES } from '../server/images.js';
import { noteSchema } from '../server/model.js';
import { prepareContent } from '../server/content.js';

test('rich text preserves formatting and removes scripts, remote images, unsafe links and styles', () => {
  const note = prepareContent({ format: 'richtext', content: '<p style="text-align:center;background-image:url(https://invalid.example/x)"><strong>Idea</strong> <u>clave</u><span style="color:#ff0000;font-size:24px;font-family:Georgia">Rojo</span></p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)" onclick="alert(1)">peligro</a><a href="https://example.org">seguro</a>' });
  assert.match(note.content, /<strong>Idea<\/strong>/); assert.match(note.content, /color:#ff0000/); assert.match(note.content, /text-align:center/);
  assert.doesNotMatch(note.content, /script|<img|onclick|background-image|invalid.example/); assert.match(note.content, /rel="noopener noreferrer"/);
  assert.match(note.plainText, /Idea claveRojo\n/); assert.doesNotMatch(note.plainText, /<p|<strong/);
  assert.equal(prepareContent({ format: 'markdown', content: '```sql\nselect 1\n```' }).content, '```sql\nselect 1\n```');
});
test('image payload is decoded, normalized, hashed and rejects disguised files', async () => {
  const data = (await sharp({ create: { width: 24, height: 12, channels: 3, background: '#559977' } }).png().toBuffer()).toString('base64');
  const [image] = await prepareImages([{ name: 'evidencia.png', data }]);
  assert.equal(image.mime, 'image/webp'); assert.equal(image.width, 24); assert.equal(image.height, 12); assert.equal(image.hash.length, 64);
  const [again] = await prepareImages([{ name: 'otro.webp', data: image.data }]); assert.equal(again.hash, image.hash);
  await assert.rejects(prepareImages([{ name: 'falsa.png', data: Buffer.from('<svg><script/></svg>').toString('base64') }]), /Imagen inválida/);
  await assert.rejects(prepareImages([{ name: 'rota.png', data: '****' }]), /datos válidos/);
  const animated = Buffer.concat([Buffer.from(data, 'base64').subarray(0, 8), Buffer.from([0,0,0,8]), Buffer.from('acTL'), Buffer.alloc(12)]);
  await assert.rejects(prepareImages([{ name: 'animada.png', data: animated.toString('base64') }]), /sin animación/);
  await assert.rejects(prepareImages([{ name: 'grande.png', data: Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64') }]), /4 MB/);
  const enormous = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(prepareImages([{ name: 'demasiados-pixeles.png', data: enormous.toString('base64') }]), /24 megapíxeles/);
});
test('note schema keeps attachment references and enforces count and caption limits', () => {
  const note = { title: 'Nota', categoryId: 'c', images: [{ id: 'dd15e228-4490-4b6c-9e90-201dbb3d96db', name: 'Captura', caption: 'Antes del cambio' }] };
  assert.equal(noteSchema.parse(note).images[0].caption, 'Antes del cambio');
  assert.equal(noteSchema.parse({ title: 'Anterior', categoryId: 'c' }).format, 'markdown');
  assert.throws(() => noteSchema.parse({ ...note, images: Array(9).fill(note.images[0]) }));
  assert.throws(() => noteSchema.parse({ ...note, images: [{ name: 'sin datos' }] }));
  assert.throws(() => noteSchema.parse({ ...note, images: [{ ...note.images[0], caption: 'x'.repeat(1001) }] }));
});
