import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decodeEntities, extractTitle, htmlToText, sliceContent } from './extract.ts'

test('decodifica entidades con nombre y numéricas', () => {
  assert.equal(decodeEntities('Tr&aacute;mite &#241; &#x00BF;s&iacute;? &amp;'), 'Trámite ñ ¿sí? &')
})

test('htmlToText saca scripts, menús y botones para compartir', () => {
  const html = `<nav>Inicio Novedades</nav><h1>Buena Conducta</h1>
    <script>alert('x')</script><p>Requisitos:</p><ul><li>DNI</li><li>Estampilla</li></ul>
    <a>Compartir en Facebook</a><div>Compartir en X</div>`
  assert.equal(htmlToText(html), 'Buena Conducta\nRequisitos:\nDNI\nEstampilla')
})

test('htmlToText no guarda el nombre del responsable (dato de una persona)', () => {
  const html = '<div>Domicilio:</div><div>Moreno 575</div><div>Responsable:</div><div>Persona Ficticia</div><div>Horario: 8 a 12</div>'
  assert.equal(htmlToText(html), 'Domicilio:\nMoreno 575\nHorario: 8 a 12')
})

test('sliceContent recorta entre marcadores y devuelve todo si no encuentra el inicio', () => {
  assert.equal(sliceContent('menu<main>hola</main>pie', '<main', '</main>'), '<main>hola')
  assert.equal(sliceContent('sin marcador', '<main', '</main>'), 'sin marcador')
})

test('extractTitle prefiere el h1 y limpia el prefijo del portal', () => {
  assert.equal(extractTitle('<title>x</title>', '<h1> Transporte </h1>'), 'Transporte')
  assert.equal(extractTitle('<title>Portal Oficial Formosa || Trámites</title>', ''), 'Trámites')
})
