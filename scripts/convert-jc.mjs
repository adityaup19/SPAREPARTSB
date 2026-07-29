import fs from "fs";
import path from "path";

/**
 * One-time converter: reads the extracted Johnson Controls xlsx (Inventory
 * sheet) and writes a cleaned, de-duplicated dataset to src/data/jc-inventory.json
 * so the app can seed real inventory with no spreadsheet/network dependency.
 */

const exDir = path.join(process.env.TEMP || process.env.TMP, "jc_xlsx", "ex");
const OUT = path.join(process.cwd(), "src", "data", "jc-inventory.json");

function decode(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function readSharedStrings() {
  const xml = fs.readFileSync(path.join(exDir, "xl", "sharedStrings.xml"), "utf8");
  const out = [];
  const siRe = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRe.exec(xml))) {
    let text = "";
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(m[1]))) text += t[1];
    out.push(decode(text));
  }
  return out;
}

function colToIdx(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function readSheet(sheetFile, shared) {
  const xml = fs.readFileSync(path.join(exDir, "xl", "worksheets", sheetFile), "utf8");
  const rows = [];
  const rowRe = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml))) {
    const cells = [];
    const cRe = /<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cRe.exec(rm[2]))) {
      const col = cm[1];
      const attrs = cm[2];
      const body = cm[3];
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(body);
      let val = vMatch ? vMatch[1] : "";
      if (/t="s"/.test(attrs)) val = shared[parseInt(val, 10)] ?? "";
      else if (/t="str"/.test(attrs)) val = decode(val);
      else if (/t="inlineStr"/.test(attrs)) {
        const im = /<t[^>]*>([\s\S]*?)<\/t>/.exec(body);
        val = im ? decode(im[1]) : "";
      }
      cells[colToIdx(col)] = typeof val === "string" ? val : String(val);
    }
    rows.push(cells);
  }
  return rows;
}

const clean = (v) => (v ?? "").toString().trim();
const isNA = (v) => {
  const s = clean(v).toLowerCase();
  return s === "" || s === "n/a" || s === "na" || s === "none" || s === "not specified";
};

/** Pick a visual category (drives the catalog thumbnail) from the description. */
function categorize(desc) {
  const d = (desc || "").toLowerCase();
  if (/(relay|isolator|zam|iam|module|monitor|suppressor|transient|overvoltage)/.test(d)) return "relay";
  if (/(card|4100|4010|4120|4007|network|cpu|interface|graphic|annunciator)/.test(d)) return "controller";
  if (/(speaker|spkr|audio)/.test(d)) return "sensor";
  if (/(strobe|horn|a\/v|s\/v|v\/o|a\/o|av |vo |mcvo|multitone|multi-tone|signal|chime|bell|sync)/.test(d)) return "sensor";
  if (/(detector|sensor|smoke|co |carbon|photo|duct|test station|remote test)/.test(d)) return "sensor";
  if (/(harness|cable|wire|eol|standoff)/.test(d)) return "belt";
  if (/(battery|power|dact)/.test(d)) return "drive";
  if (/(box|backbox|skirt|cover|plate|mounting|bracket|guard|enclosure|escutcheon|adapter|ring|housing|bezel|grille|grill|cage|dome|stopper)/.test(d)) return "gasket";
  if (/(pull station|station|push|break-glass)/.test(d)) return "controller";
  if (/(pump|valve|actuator)/.test(d)) return "actuator";
  return "controller";
}

const shared = readSharedStrings();
const rows = readSheet("sheet1.xml", shared).slice(1); // drop header

const byPart = new Map();
for (const r of rows) {
  const partNumber = clean(r[5]);
  if (!partNumber) continue;
  const description = clean(r[7]) || partNumber;
  const brand = isNA(r[4]) ? "Johnson Controls" : clean(r[4]);
  const pid = isNA(r[6]) ? null : clean(r[6]);
  const qtyRaw = clean(r[8]).replace(/[^0-9.]/g, "");
  const qty = qtyRaw ? Math.max(0, Math.round(parseFloat(qtyRaw))) : 1;
  const aisle = clean(r[0]) || null;
  const shelf = clean(r[1]) || null;
  const bin = clean(r[2]) || null;
  const notes = isNA(r[12]) ? null : clean(r[12]);

  if (byPart.has(partNumber)) {
    // Same part number in another bin -> merge quantities, keep first location.
    const existing = byPart.get(partNumber);
    existing.totalQuantity += qty;
  } else {
    byPart.set(partNumber, {
      name: description.slice(0, 120),
      partNumber,
      manufacturer: brand,
      modelNumber: pid,
      totalQuantity: qty,
      location: "Main Warehouse",
      aisle,
      shelf,
      bin,
      condition: "New",
      notes,
      category: categorize(description),
    });
  }
}

const parts = [...byPart.values()];
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(parts, null, 2));

const units = parts.reduce((s, p) => s + p.totalQuantity, 0);
console.log(`Wrote ${parts.length} unique parts (${units} total units) -> ${OUT}`);
console.log("Sample:", JSON.stringify(parts.slice(0, 3), null, 2));
