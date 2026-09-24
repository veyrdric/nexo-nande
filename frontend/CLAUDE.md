# CLAUDE.md — frontend (Vite + React + TS) · dueño: Franco

Stack: Vite, React, TypeScript estricto, Tailwind, shadcn/ui, TanStack Query. Arquitectura **FSD v2.1** según `docs/base/03-especificacion-frontend-fsd.md`.

## Reglas
- Capas: `app → pages → widgets → features → entities → shared`. Una capa nunca importa de una superior; dos slices del mismo nivel no se importan entre sí.
- Importar solo por el `index.ts` del slice.
- **Contra el contrato:** tipos generados desde `contracts/`; mientras el backend no esté, usar `contracts/mocks/` (MSW). Nunca inventar campos.
- **Chat anónimo:** no pedir nombre, teléfono ni DNI. Nada de datos personales en `localStorage`; como mucho un id de sesión aleatorio.
- **Renderizado seguro:** nunca `dangerouslySetInnerHTML` con texto del asistente o del usuario. Los enlaces a fuentes, con `rel="noopener noreferrer"`.
- **Accesibilidad:** tipografía grande, alto contraste, botones grandes; pensar en adultos mayores y conexiones lentas.
- Aviso visible y fijo: "Servicio informativo, no oficial. Verificá siempre con el IPF."
- Botón "Borrar conversación" (P0 de privacidad para la web).

## Pruebas mínimas
Render del mensaje del asistente con checklist y fuente · estado "no sé" · error de red · borrar conversación.

## Comandos
`npm run dev` · `npm run lint` · `npm run build` (se definen en M0/M7)
