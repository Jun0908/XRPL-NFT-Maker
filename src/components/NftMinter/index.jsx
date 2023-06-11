import { Button } from "@mui/material";
import { Xumm } from "xumm";
import "./index.css";
import { useEffect, useState } from "react";
import { Buffer } from "buffer";
import { XrplClient } from 'xrpl-client'
import { NFTStorage } from "nft.storage";
import { extractAffectedNFT } from "@xrplkit/txmeta";

//require("dotenv").config();

const xumm = new Xumm("99db0545-9d6c-4a1d-a8de-0e4b808001de");
const nftStorage = new NFTStorage({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweEI1ZGQ2MUNEMjVmZDgxM0MyNEQ1YUNFNThjZDYwNzQ4OGFiQzE1N2UiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTY4NjI5NjQxODU1MiwibmFtZSI6InRlc3QifQ.CEtfoZZhcLJiKF6GW3SYw4gI3bAJveVDp5U8odEcf4M'})

export const NftMinter = () => {
  const [account, setAccount] = useState(undefined);
  const [file, setFile] = useState(undefined);

  useEffect(() => {
    xumm.on("success", async () => {
      setAccount(await xumm.user.account);
    });
  }, []);

  const connect = () => {
    xumm.authorize();
  };

  const uploadImage = (e) => {
    const files = e.target.files;
    setFile(files[0])
  };

  const mint = async () => {
    if (!file) {
      alert("画像ファイルを選択してください！");
      return;
    }
    const { url } = await nftStorage.store({
      schema: "ipfs://QmNpi8rcXEkohca8iXu7zysKKSJYqCvBJn3xJwga8jXqWU",
      nftType: "art.v0",
      image: file,
      name: "some name",
      description: "some description",
    });
    const payload = await xumm.payload.createAndSubscribe({
      TransactionType: "NFTokenMint",
      NFTokenTaxon: 0,
      Flags: 8,
      URI: Buffer.from(url).toString("hex"),
    });
    payload.websocket.onmessage = (msg) => {
      const data = JSON.parse(msg.data.toString());
      if (typeof data.signed === "boolean") {
        payload.resolve({ signed: data.signed, txid: data.txid });
      }
    };
    const { signed, txid } = await payload.resolved;
    if (!signed) {
      alert("トランザクションへの署名は拒否されました！");
      return;
    }
    const client = new XrplClient("wss://testnet.xrpl-labs.com");
    const txResponse = await client.send({
      command: "tx",
      transaction: txid,
    });
    const nftoken = extractAffectedNFT(txResponse);
    alert('NFTトークンが発行されました！')
    window.open(`https://test.bithomp.com/nft/${nftoken.NFTokenID}`, "_blank");
  };

  return (
    <div className="nft-minter-box">
      <div className="title">XRP NFT</div>
      <div className="account-box">
        <div className="account">{account}</div>
        <Button variant="contained" onClick={connect}>
          connect
        </Button>
      </div>
      <div className="image-box">
        <Button variant="contained" onChange={uploadImage}>
          ファイルを選択
          <input
            className="imageInput"
            type="file"
            accept=".jpg , .jpeg , .png"
          />
        </Button>
      </div>
      {file && (
          <img
            src={window.URL.createObjectURL(file)}
            alt="nft"
            className="nft-image"
          />
      )}
      {account && (
        <div>
          <Button variant="outlined" onClick={mint}>
            mint
          </Button>
        </div>
      )}
    </div>
  );
};
