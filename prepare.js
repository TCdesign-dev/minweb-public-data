import fs from "fs";
import { unfurl } from "unfurl.js";
import axios from "axios";
import { getDominantColor, rgbColorToCssString } from "@unpic/placeholder";
import { getPixels } from "@unpic/pixels";
import pMap from "p-map";

async function getFallbackColor(url) {
  const { data } = await getPixels(url);
  return rgbColorToCssString(getDominantColor(data));
}

function readFile() {
  const data = fs.readFileSync("./data/links.json", "utf8");
  const parsedData = JSON.parse(data);
  return parsedData;
}

async function getLink(item) {
  console.log("Processing", item.title, item.link)
  const link = item.link;
  const title = item.title;
  const fallbackImage =
    "https://og.barelyhuman.xyz/generate?fontSize=14&backgroundColor=%23121212&title=" +
    title +
    "&fontSizeTwo=8&color=%23efefef";

  try {
    const result = await unfurl(link);
    let imageLink = fallbackImage;
    if (result.open_graph?.images?.length > 0) {
      imageLink =
        result.open_graph.images[0].secure_url ||
        result.open_graph.images[0].url;
    }

    const valid = await axios
      .get(imageLink, {
        timeout: 5000,
      })
      .then((d) => true)
      .catch((d) => {
        return false;
      });

    if (!valid) {
      imageLink = fallbackImage;
    }

    item.imageURL = imageLink;
    item.backgroundColor = await getFallbackColor(imageLink);
    return item;
  } catch (err) {
    console.log({ err });
    item.imageURL = fallbackImage;
    return item;
  }
}

async function prepareLinks() {
  const data = readFile();
  const collection = await pMap(data, getLink, { concurrency: 5 });
  fs.writeFileSync("data/links.json", JSON.stringify(collection, null, 2));
}

prepareLinks()
  .then((d) => {
    process.exit(0);
  })
  .catch((d) => {
    console.error(d);
    process.exit(1);
  });
