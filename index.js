import express from 'express';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { URL, URLSearchParams } from 'url';
import fetch from 'node-fetch';
import got from 'got';
import cors  from 'cors';
import dotenv from "dotenv";
dotenv.config();

import { request, gql, GraphQLClient } from 'graphql-request'

const PORT = process.env.PORT || 80;
const BITQUERY_ENDPOINT = "https://graphql.bitquery.io/"

const json = fs.readFileSync(path.resolve('data/markets.json'));
const tokenJson = fs.readFileSync(path.resolve('data/tokens.json'));
const marketData = JSON.parse(json);
const tokens = JSON.parse(tokenJson);

const app = express();
app.use(express.static('public'));
app.use(
  bodyParser.urlencoded({
    extended: false,
  }),
);
app.use(bodyParser.json());
app.use(cors())

app.get('/api/v1/markets', (request, response) => {
  getMarketData()
  .then(data => {
    console.log(data)
    response.send({ data: data[0] });
  }); 
});

app.post('/api/v1/bitquery/pairs', (request, response) => {
  sendBitQueryRequest(makeQueryTokenPairs('0x9b71b5511998e0798625b8fa74e86d8192de78c1'))
    .then(data => {
      console.log(data)
      response.send({ data: data});
    }); 
});

const client = new GraphQLClient(BITQUERY_ENDPOINT, {
  headers: {
   'Content-Type': 'application/json',
   'Access-Control-Allow-Origin': '*',
   'X-API-KEY': process.env.BITQUERY_API_KEY,
  } 
})

app.post('/api/v1/bitquery/liquidity', async function(request, response, next) {
  const address = []
  await Promise.all(marketData.map(async (token, i) => {

    const pairData = await client.request(makeQueryTokenPairs(token.address))
    const dexTrades = pairData.ethereum.dexTrades
    await Promise.all(dexTrades.map(async (element, j) => {
      if (element.exchange.fullName === 'Pancake v2'){
        console.log('element.pair.symbol', element.pair.symbol)
        const input = (element.pair.symbol == 'Cake' || element.pair.symbol == "WBNB") ? element.pair : token;
        const output = (element.pair.symbol == 'Cake' || element.pair.symbol == "WBNB") ? token : element.pair;
        const id = 1
        
        const obj = {}
        obj.id = "" + i + j
        obj.pairInputSymbol = input.symbol
        obj.pairInputAddress = input.address
        obj.pairInputName = filterNameOfToken(input.symbol)
        obj.pairInputDecimals = filterDecimalsOfToken(input.symbol)
        obj.pairInputChainId = filterChainIdOfToken(input.symbol)
        obj.pairInputLogoUrl = filterLogoUrlOfToken(input.symbol)

        obj.pairOutputSymbol = output.symbol
        obj.pairOutputAddress = output.address
        obj.pairOutputName = filterNameOfToken(output.symbol)
        obj.pairOutputDecimals = filterDecimalsOfToken(output.symbol)
        obj.pairOutputChainId = filterChainIdOfToken(output.symbol)
        obj.pairOutputLogoUrl = filterLogoUrlOfToken(output.symbol)

        obj.exchange = element.exchange.fullName
        obj.address = element.poolToken.address.address

        const res = await client.request(makeQueryTokenPools(element.poolToken.address.address, token.address, element.pair.address))
        const poolsData = res
        if(poolsData) {
          const inputPools = poolsData.ethereum.address[0].balances[0].value
          const outputPools = poolsData.ethereum.address[0].balances[1].value
          obj.inputPools = inputPools
          obj.outputPools = outputPools
          obj.totalLiquidity = outputPools * request.body.data.price * 2
        }
        address.push(obj)
      }
    }))
  }))
  console.log('address',address )
  response.send({ data: address});
});

app.listen(PORT, () => {
  console.log(`LPK SERVER listening on port ${PORT}!`)
});

async function getMarketData() 
{
  const MARCKET_ENDPOINT = 'https://api.coingecko.com/api/v3/coins/markets';    
  const url = new URL(MARCKET_ENDPOINT)
  var params = {
    vs_currency: 'usd', 
    ids: 'l-pesa', 
    order: 'market_cap_desc', 
    per_page: 10, 
    page: 1, 
    sparkline:false,
    price_change_percentage: '24h'
  }
  url.search = new URLSearchParams(params).toString();
  try {
    let response = await fetch(url, {
      responseType: 'json',
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // 'X-API-KEY': process.env.BITQUERY_API_KEY,
      },
    });
    if(response.status == 200){
      return response.json()
    }else if(response.status == 429){
    }
  } catch (error) {
    console.log('LPK SERVER error', error)        
  }
}

function filterOfToken(symbol) {
  const filteredItem = tokens.TOKENS.find(o => 
    Object.entries(o).some(
      ([k, value]) => k === 'symbol' && value === symbol
    )
  );
  return filteredItem
}

function filterLogoUrlOfToken(symbol) {
  const item = filterOfToken(symbol)
  if (item) {
    return item.logoURI
  }else{
    const url = "./assets/images/tokens/unknown.png"
    return url
  }
}

function filterChainIdOfToken(symbol) {
  const item = filterOfToken(symbol)
  if (item) {
    return item.chainId
  }else{
    const chainId = 56
    return chainId
  }
}

function filterNameOfToken(symbol) {
  const item = filterOfToken(symbol)
  if (item) {
    return item.name
  }else{
    const name = "unknown token"
    return name
  }
}

function filterDecimalsOfToken(symbol) {
  const item = filterOfToken(symbol)
  if (item) {
    return item.decimals
  }else{
    const decimals = 18
    return decimals
  }
}

// app.post('/api/v1/cmc', (request, response) => {
//   getCmcMap()
//     .then(data => {
//       console.log(data)
//       response.send({ data: data });
//     });
// });

// async function getCmcMap() 
// {
//   const CMC_ENDPOINT = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/trending/latest';    
//   const url = new URL(CMC_ENDPOINT)
//   var params = {
//   }
//   url.search = new URLSearchParams(params).toString();
  
//   try {
//     let response = await fetch(url, {
//       headers: { 
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//         // 'X-API-KEY': process.env.BITQUERY_API_KEY,
//         'X-CMC_PRO_API_KEY': "2866aa91-be9d-484a-8fdc-ac9a98db156d"
      
//       },
//     });
//     console.log('response', response)
//     if(response.status == 200){
//       return response.json()
//     }else if(response.status == 429){
//       console.log(response.statusText)        
//     }
//   } catch (error) {
//     console.log('LPK SERVER error', error)        
//   }
// }

function makeQueryTokenPair(token, network='bsc') {
  const query = gql`
    {
      ethereum(network: ${network}) {
          dexTrades(
            baseCurrency: {is: "${token}"}
            options: {desc: "trades", limit: 10}
          ) {
            poolToken: smartContract {
                address {
                  address
                }
            }
            exchange {
                fullName
            }
            pair: quoteCurrency {
                symbol
                address
            }
            trades: count
            quotePrice
        }
      }
    }
    `
    return query
}

function makeQueryTokenPairs(token, network='bsc') {
  const query = gql`
    {
      ethereum(network: ${network}) {
          dexTrades(
            baseCurrency: {is: "${token}"}
            options: {desc: "trades", limit: 10}
          ) {
            poolToken: smartContract {
                address {
                  address
                }
            }
            exchange {
                fullName
            }
            pair: quoteCurrency {
                symbol
                address
            }
            trades: count
            quotePrice
        }
      }
    }
    `
    return query
}

function makeQueryTokenPools(address, baseToken, pairedToken, network='bsc') {
  const query = gql`
    {
      ethereum(network: ${network}) {
        address(address: {is: "${address}"}) {
          balances(currency: {in: ["${baseToken}", "${pairedToken}"]}) {
            currency {
              address
              name
              symbol
            }
            value
          }
        }
      }
    }
    `
    return query
}

function makeQueryLatestPrice(address0, address1, network = 'bsc') {
  return gql`
  {
    ethereum(network: ${network}) {
      dexTrades(
        options: {desc: ["block.height", "tradeIndex"], limit: 1}
        exchangeName: {in: ["Pancake", "Pancake v2"]}
        baseCurrency: {is: "${address0}"}
        quoteCurrency: {is: "${address1}"}
      ) {
        transaction {
          hash
        }
        tradeIndex
        smartContract {
          address {
            address
          }
          contractType
          currency {
            name
          }
        }
        tradeIndex
        block {
          height
        }
        baseCurrency {
          symbol
          address
        }
        quoteCurrency {
          symbol
          address
        }
        quotePrice
      }
    }
  }  
  `
}