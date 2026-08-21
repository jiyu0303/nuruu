export const splitNarration = (text: string): string[] => {
  if (!text) return [];

  // Replace <br> and <br/> with \n for unified processing
  const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
  
  const blocks: string[] = [];
  let currentBlock = '';
  
  const bracketPairs: Record<string, string> = {
    '"': '"',
    "'": "'",
    '「': '」',
    '『': '』',
    '(': ')',
    '（': '）',
    '[': ']',
    '{': '}',
    '<': '>'
  };
  
  const closingBrackets = ['"', "'", '」', '』', ')', '）', ']', '}', '>'];
  
  const isPunctuation = (c: string) => ['.', '?', '!', '~'].includes(c);
  const isDigit = (c: string) => /[0-9]/.test(c);
  const isSpace = (c: string) => /\s/.test(c);
  // Matches letters (Korean, English, etc.), digits, or any opening brackets
  const isWordOrOpenChar = (c: string) => {
    if (!c) return false;
    if (Object.keys(bracketPairs).includes(c)) return true;
    return /[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/.test(c);
  };

  // Heuristic to decide if a quote acts as opening or closing
  const parseQuoteType = (txt: string, index: number): 'open' | 'close' => {
    if (index === 0) return 'open';
    const prev = txt[index - 1];
    if (isSpace(prev) || Object.keys(bracketPairs).includes(prev)) {
      return 'open';
    }
    return 'close';
  };

  // Get outermost matched pairs
  interface MatchedPair {
    start: number;
    end: number;
    openChar: string;
    closeChar: string;
    hasPunctuation: boolean;
  }

  // Resolves the outer bracket/quote pairs to be protected or specially split
  const getOutermostPairs = (txt: string): MatchedPair[] => {
    const allPairs: { start: number; end: number; openChar: string; closeChar: string; hasPunctuation: boolean }[] = [];
    
    // Create an independent stack for each opening bracket character
    const stacks: Record<string, number[]> = {};
    for (const openChar of Object.keys(bracketPairs)) {
      stacks[openChar] = [];
    }

    const endsWithPunctuation = (str: string, startIdx: number, endIdx: number): boolean => {
      let k = endIdx - 1;
      while (k > startIdx && (isSpace(str[k]) || closingBrackets.includes(str[k]))) {
        k--;
      }
      if (k > startIdx && isPunctuation(str[k])) {
        return true;
      }
      return false;
    };

    for (let idx = 0; idx < txt.length; idx++) {
      const char = txt[idx];
      const isOpen = Object.keys(bracketPairs).includes(char);
      const isClose = closingBrackets.includes(char);

      if (isOpen) {
        if (char === '"' || char === "'") {
          const type = parseQuoteType(txt, idx);
          if (type === 'close') {
            const stack = stacks[char];
            if (stack.length > 0) {
              const startIdx = stack.pop()!;
              if (stack.length === 0) {
                const endsPunct = endsWithPunctuation(txt, startIdx, idx);
                allPairs.push({
                  start: startIdx,
                  end: idx,
                  openChar: char,
                  closeChar: char,
                  hasPunctuation: endsPunct
                });
              }
            } else {
              stacks[char].push(idx);
            }
          } else {
            stacks[char].push(idx);
          }
        } else {
          stacks[char].push(idx);
        }
      } else if (isClose) {
        const openChar = Object.keys(bracketPairs).find(k => bracketPairs[k] === char);
        if (openChar && openChar !== char) {
          const stack = stacks[openChar];
          if (stack.length > 0) {
            const startIdx = stack.pop()!;
            if (stack.length === 0) {
              const endsPunct = endsWithPunctuation(txt, startIdx, idx);
              allPairs.push({
                start: startIdx,
                end: idx,
                openChar,
                closeChar: char,
                hasPunctuation: endsPunct
              });
            }
          }
        }
      }
    }

    // Filter to obtain only the outermost pairs (not nested within any other pair)
    const outermostPairs: MatchedPair[] = [];
    // Sort pairs by span: longest first
    const sortedPairs = [...allPairs].sort((a, b) => (b.end - b.start) - (a.end - a.start));
    
    for (const p of sortedPairs) {
      const isEnclosed = outermostPairs.some(outer => p.start >= outer.start && p.end <= outer.end);
      if (!isEnclosed) {
        outermostPairs.push(p);
      }
    }

    // Sort by starting position ascending and filter abnormally long quotes
    return outermostPairs.sort((a, b) => a.start - b.start).filter(p => {
      const len = p.end - p.start;
      if (len > 300) return false;
      return true;
    });
  };

  const outermostPairs = getOutermostPairs(normalizedText);

  const getContainingPair = (idx: number): MatchedPair | null => {
    for (const p of outermostPairs) {
      if (idx >= p.start && idx <= p.end) {
        return p;
      }
    }
    return null;
  };

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    
    // Check explicit newlines -> guaranteed split
    if (char === '\n') {
      if (currentBlock.trim().length > 0) {
        blocks.push(currentBlock.trim());
      }
      currentBlock = '';
      continue;
    }

    // Check if we are at the START index of a splittable outermost pair
    const containingPair = getContainingPair(i);
    if (containingPair && i === containingPair.start) {
      if (containingPair.hasPunctuation) {
        // Splittable pair! Split before the pair starts if there's text before it.
        if (currentBlock.trim().length > 0) {
          blocks.push(currentBlock.trim());
          currentBlock = '';
        }
      }
    }

    // Append char to current block
    currentBlock += char;

    // Check if we can split AFTER this character
    let canSplit = false;
    let punctuationIndex = -1;

    if (containingPair) {
      // If we are INSIDE an outermost pair, we ONLY split at the exact END of the pair, and ONLY if the pair contains a sentence-ending punctuation
      if (i === containingPair.end && containingPair.hasPunctuation) {
        canSplit = true;
        // Find the punctuation before the end of the pair to check digit sandwich
        let k = i - 1;
        while (k >= containingPair.start && (closingBrackets.includes(normalizedText[k]) || isSpace(normalizedText[k]))) {
          k--;
        }
        if (k >= containingPair.start && isPunctuation(normalizedText[k])) {
          punctuationIndex = k;
        }
      }
    } else {
      // OUTSIDE any outermost pair:
      if (isPunctuation(char)) {
        // Check if next char is also a punctuation (e.g. "...", "?!", "~~")
        if (i + 1 < normalizedText.length && isPunctuation(normalizedText[i + 1])) {
          // Do not split yet, wait until the last punctuation
        } else {
          canSplit = true;
          punctuationIndex = i;
        }
      } else if (closingBrackets.includes(char)) {
        // Check if there is sentence-ending punctuation right before (allowing other closing brackets/spaces)
        let k = i - 1;
        while (k >= 0 && (closingBrackets.includes(normalizedText[k]) || isSpace(normalizedText[k]))) {
          k--;
        }
        if (k >= 0 && isPunctuation(normalizedText[k])) {
          canSplit = true;
          punctuationIndex = k;
        }
      }
    }

    if (canSplit) {
      // Look ahead to check the split condition:
      // Condition A: 1+ spaces followed by any char/digit (non-space) or another open sign
      // Condition B (Improvement): No space but the very next character is a word/digit/bracket start (Korean/English letter, open bracket) and we are terminating a bracket/quote pair.
      let j = i + 1;
      let spaceCount = 0;
      
      while (j < normalizedText.length && isSpace(normalizedText[j])) {
        spaceCount++;
        j++;
      }
      
      // Check if it's a valid split point based on lookahead
      if (j < normalizedText.length) {
        const prevChar = punctuationIndex > 0 ? normalizedText[punctuationIndex - 1] : '';
        const nextChar = normalizedText[j];
        
        // Skip splitting if it looks like a decimal/number sandwich (e.g. 1.5)
        if (isDigit(prevChar) && isDigit(nextChar)) {
          continue;
        }

        // We split if:
        // 1. There is at least one space (e.g. ". " or ".  ")
        // 2. OR there is NO space, but the next character is a word or brackets (Korean/English letter, digit, raw opening symbol)
        //    AND the current position (char) is one of the closing brackets so we only perform no-space-splits on paired sentences ("안 갔냐?!"그 목소리에, 않음.>짜잔~)
        const isClosingPairSite = closingBrackets.includes(char);

        if (spaceCount > 0 || (isClosingPairSite && isWordOrOpenChar(nextChar))) {
          blocks.push(currentBlock.trim());
          currentBlock = '';
          
          // skip the spaces we already evaluated
          i = j - 1; 
        }
      }
    }
  }
  
  if (currentBlock.trim().length > 0) {
    blocks.push(currentBlock.trim());
  }
  
  return blocks;
};
