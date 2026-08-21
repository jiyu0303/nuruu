const lucide = require('lucide-react');
const icons = [
  'Scissors', 'Check', 'X', 'Upload', 'Download', 'Settings', 'Eye', 'Image', 'Palette', 'CheckSquare', 'Square', 'FileJson', 'Layout', 'MessageSquare', 'Trash2', 'Plus', 'Type', 'Scaling', 'Pencil', 'Undo2', 'Redo2', 'RotateCcw', 'HelpCircle', 'ChevronRight', 'ChevronLeft', 'FileText', 'ChevronsUpDown', 'Users', 'User', 'ImageOff', 'AlignLeft', 'AlignCenter', 'AlignRight', 'Copy', 'ExternalLink', 'ArrowUpDown', 'ChevronDown', 'ChevronUp', 'Search', 'List', 'Info', 'FileDown', 'Settings2', 'UnfoldVertical', 'UnfoldHorizontal', 'MoveVertical', 'Maximize2', 'MoveHorizontal'
];

for (const icon of icons) {
  if (!(icon in lucide)) {
    console.log('Missing:', icon);
  }
}
console.log('Done verifying icons.');
