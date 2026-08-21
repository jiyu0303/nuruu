import { splitNarration } from './src/utils/textTokenizer.js';
console.log(splitNarration("안녕! 반가워. 잘 가~ 내일 봐."));
console.log(splitNarration("이것은 테스트<br>줄바꿈입니다."));
console.log(splitNarration("«이건 분리 안 됨!» 이렇게 괄호 안은 무시해야 함."));
console.log(splitNarration("숫자 1. 5 사이는 분리됨. 하지만 1.5는 안 됨."));
