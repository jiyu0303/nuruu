export const splitNarration = (text: string): string[] => {
  if (!text) return [];

  // Replace <br> and <br/> with \n for unified processing
  const normalizedText = text.replace(/<br\s*\/?>/gi, '\n');
  
  const blocks: string[] = [];
  let currentBlock = '';
  
  const openBrackets: string[] = [];
  
  const bracketPairs: Record<string, string> = {
    '"': '"',
    "'": "'",
    '「': '」',
    '『': '』',
    '(': ')',
    '<': '>'
  };
  
  const closingBrackets = Object.values(bracketPairs);
  
  const isPunctuation = (c: string) => ['.', '?', '!', '~'].includes(c);
  const isDigit = (c: string) => /[0-9]/.test(c);
  const isSpace = (c: string) => /\s/.test(c);
  
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
    
    // Manage brackets/quotes tracking
    if (Object.keys(bracketPairs).includes(char)) {
      // If it's a quote like " or ', it can be both open and close.
      // So we check if the last opened bracket is the same.
      if ((char === '"' || char === "'") && openBrackets[openBrackets.length - 1] === char) {
        openBrackets.pop();
      } else {
        openBrackets.push(char);
      }
    } else if (openBrackets.length > 0 && bracketPairs[openBrackets[openBrackets.length - 1]] === char) {
      openBrackets.pop();
    }
    
    currentBlock += char;
    
    // Try to split on punctuation if we are not inside any brackets
    if (openBrackets.length === 0 && isPunctuation(char)) {
      // Check if the next char is also a punctuation (e.g. "...", "?!", "~~")
      if (i + 1 < normalizedText.length && isPunctuation(normalizedText[i + 1])) {
        continue;
      }
      
      // Look ahead to check the split condition: 1+ spaces followed by char/digit
      let j = i + 1;
      let spaceCount = 0;
      
      while (j < normalizedText.length && isSpace(normalizedText[j])) {
        spaceCount++;
        j++;
      }
      
      // If there are spaces, and the next thing is a character/digit (i.e. not end of string)
      if (spaceCount > 0 && j < normalizedText.length) {
        const prevChar = i > 0 ? normalizedText[i-1] : '';
        const nextChar = normalizedText[j];
        
        if (isDigit(prevChar) && isDigit(nextChar)) {
          // Sandwich between digits -> do not split
          continue;
        }
        
        // It's a valid split point!
        blocks.push(currentBlock.trim());
        currentBlock = '';
        
        // skip the spaces we already evaluated
        i = j - 1; 
      }
    }
  }
  
  if (currentBlock.trim().length > 0) {
    blocks.push(currentBlock.trim());
  }
  
  return blocks;
};
