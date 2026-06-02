export const config = { api: { bodyParser: false } };

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return res.status(500).json({ error: "PINATA_JWT is not configured on the server." });
  }

  try {
    const body = await readBody(req);
    const contentType = req.headers["content-type"];
    const filename = req.query.filename || "file";

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": contentType,
      },
      body,
    });

    if (!pinataRes.ok) {
      const errText = await pinataRes.text();
      console.error("Pinata error:", errText);
      return res.status(502).json({ error: `Pinata upload failed (${pinataRes.status})` });
    }

    const data = await pinataRes.json();
    return res.status(200).json({
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
      name: filename,
    });
  } catch (err) {
    console.error("upload handler:", err);
    return res.status(500).json({ error: err.message });
  }
}
