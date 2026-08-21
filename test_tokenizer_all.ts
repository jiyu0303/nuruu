import { splitNarration } from './src/utils/textTokenizer';

const tests = [
  "첫번째 문단. 두번째 문단.",
  "이것은 문단이다! 정말로? 당연하지.",
  "띄어쓰기 없이.붙어있는 건.안 나눠진다.",
  "큰따옴표 안에는 \"안 나눠집니다. 절대로!\" 라고 했다.",
  "숫자 3.14 도 안 나눠짐.",
  "엔터 쳐볼까.\n엔터\n\n\n여러개",
  "마지막에 기호 없이 끝남",
  "마지막에 기호 있고 공백. ",
  "   앞에 공백 ",
  "이것도. \n다음줄"
];

tests.forEach((t, i) => {
  console.log(`\n--- Test ${i + 1} ---`);
  console.log(`Input: ${JSON.stringify(t)}`);
  console.log(`Result: ${JSON.stringify(splitNarration(t), null, 2)}`);
});
