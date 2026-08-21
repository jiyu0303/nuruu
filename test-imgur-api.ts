import axios from "axios";

async function main() {
  const url = "http://localhost:3000/api/imgur";
  try {
    const res = await axios.post(url, { url: "https://imgur.com/a/vxGHyRn" });
    console.log("Images fetched:", res.data.length);
    console.log("First image:", res.data[0]);
  } catch (e: any) {
    console.error(e.response?.data || e.message);
  }
}

main();
