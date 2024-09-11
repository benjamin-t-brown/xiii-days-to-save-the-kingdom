import * as fs from 'fs';
import * as path from 'path';

const mapPath = path.resolve(__dirname, '../scratch/map1.tmj');
const outputPath = path.resolve(__dirname, '../src/maps.ts');

const main = async () => {
  const mapJson = fs.readFileSync(mapPath, 'utf8');
  const map = JSON.parse(mapJson);
  const baseLayer = map.layers[0];
  const controlLayer = map.layers[1];

  const tileData = baseLayer.data;
  const controlData = {};
  for (let i = 0; i < controlLayer.data.length; i++) {
    const controlId = controlLayer.data[i];
    const controlLevel = controlId - 40;
    if (controlLevel > 0) {
      controlData[i] = controlLevel;
    }
  }

  const outputData: (string | number)[] = [];
  for (let i = 0; i < tileData.length; i++) {
    const dataId = tileData[i];
    const controlLevel = controlData[i];
    if (controlLevel) {
      outputData.push(dataId + ',' + controlLevel);
    } else {
      outputData.push(dataId);
    }
  }

  // data: ${JSON.stringify(outputData, null, 2)},
  const formattedMap = `export const map1 = {
  width: ${map.width},
  height: ${map.height},
  data: '${outputData.join(' ')}'.split(' ')
};`;

  console.log('output map to ', outputPath);
  fs.writeFileSync(outputPath, formattedMap);
};
main();
