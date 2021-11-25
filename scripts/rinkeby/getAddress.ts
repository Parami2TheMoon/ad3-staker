import { getImplementationAddress } from '@openzeppelin/upgrades-core';
import { JsonRpcProvider } from '@ethersproject/providers' 

async function main() {
    const provider = new JsonRpcProvider('https://rinkeby.infura.io/v3/2c1781167b104bbf8766a67881984394', 4)
    const currentImplAddress = await getImplementationAddress(provider, '0xB6987F36D4189eC1ab2A5dC1bf212B03f69BcFe3');
    console.log(currentImplAddress);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
