const text = "?! 안녕. 반가워";
const sentenceRegex = /([^.!?\"”’]+[.!?\"”’]+[\s]*)/g;
const matches = text.match(sentenceRegex);
console.log("matches:", matches);
if (matches) {
  const matchedText = matches.join("");
  let remaining = text.substring(matchedText.length).trim();
  console.log("matchedText.length:", matchedText.length);
  console.log("remaining:", remaining);
}
