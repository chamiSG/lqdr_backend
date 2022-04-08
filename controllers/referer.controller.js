const dotenv = require('dotenv');
dotenv.config();
const crypto = require ("crypto");
const algorithm = "aes-256-cbc"; 
const initVector = Buffer.from(process.env.INITVECTOR, "hex");
const Securitykey = Buffer.from(process.env.SECURITYKEY, "hex");


let referers = new Map();
exports.getReferralURL = (req, res) => {
  const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
  let addr = req.body.walletAddr;
  let encryptedData = cipher.update(addr, "utf-8", "hex");
  
  encryptedData += cipher.final("hex");
  console.log(req.body);
  res.send({
    url: req.headers.host+'?referral='+encryptedData,
    info: encryptedData
  });
};

exports.setReferer = (req, res) => {
  const decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
  let addr = req.body.walletAddr;
  let refInfo = req.body.refInfo;
  console.log(refInfo);
  let decryptedData = decipher.update(refInfo, "hex", "utf-8");
  decryptedData += decipher.final("utf8");
  referers[addr] = decryptedData;

  res.send({
    success: true
  });
};

exports.getReferer = (req, res) => {
  let addr = req.body.walletAddr;
  
  res.send({
    referer: referers[addr]
  });
};