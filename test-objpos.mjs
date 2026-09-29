import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync } from "node:fs";
const font = readFileSync("node_modules/@fontsource/manrope/files/manrope-latin-400-normal.woff");
// PNG real 400x800 (portrait) metade vermelha em cima, azul embaixo
const png = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="800"><rect width="400" height="400" fill="red"/><rect y="400" width="400" height="400" fill="blue"/></svg>`).render().asPng();
const uri = "data:image/png;base64," + png.toString("base64");
const fonts = [{ name: "Manrope", data: font, weight: 400 }];

console.log("--- backgroundImage cover, quadro 200x200 (imagem portrait 400x800) ---");
const svg1 = await satori(
  { type: "div", props: { style: { display: "flex", width: 200, height: 200, backgroundImage: `url(${uri})`, backgroundSize: "cover", backgroundPosition: "center" } } },
  { width: 200, height: 200, fonts },
);
console.log(svg1.match(/<image[^>]+>/)[0].slice(0, 260));

console.log("--- img objectFit cover objectPosition '50% 20%' ---");
const svg2 = await satori(
  { type: "div", props: { style: { display: "flex", width: 200, height: 200, overflow: "hidden" }, children: { type: "img", props: { src: uri, width: 200, height: 200, style: { objectFit: "cover", objectPosition: "50% 20%" } } } } },
  { width: 200, height: 200, fonts },
);
console.log(svg2.match(/<image[^>]+>/)[0].slice(0, 260));

console.log("--- img objectFit cover sem position ---");
const svg3 = await satori(
  { type: "div", props: { style: { display: "flex", width: 200, height: 200, overflow: "hidden" }, children: { type: "img", props: { src: uri, width: 200, height: 200, style: { objectFit: "cover" } } } } },
  { width: 200, height: 200, fonts },
);
console.log(svg3.match(/<image[^>]+>/)[0].slice(0, 260));
