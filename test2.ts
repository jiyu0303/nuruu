import { splitNarration } from './src/utils/textTokenizer';
import DOMPurify from 'dompurify';
import { linkifyAndFormat } from './src/utils';

console.log("Starting test");
try {
  let content = "테스트 텍스트입니다. 줄바꿈을 해보겠습니다.";
  let textPieces = splitNarration(content);
  console.log({ textPieces });
  
  let htmlPieces = textPieces.map(piece => {
    let pieceHtml = linkifyAndFormat(piece);
    // return DOMPurify.sanitize(pieceHtml, { ADD_ATTR: ['target'] });
    // Just mock DOMPurify because it might not work in node without window
    return pieceHtml;
  });
  console.log({ htmlPieces });
} catch(e) {
  console.error("ERROR:", e);
}
