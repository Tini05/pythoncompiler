import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import 'prismjs/themes/prism.css';

import Prism from 'prismjs';
import 'prismjs/components/prism-python';

const { highlight, languages } = Prism;

const CodeEditor: React.FC = () => {
  const [code, setCode] = useState<string>('');

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  return (
    <div className="code-editor">
      <Editor
        value={code}
        onValueChange={handleCodeChange}
        highlight={(code) => highlight(code, Prism.languages.python, 'python')}
        padding={10}
        style={{
          fontFamily: '"Fira code", "Fira Mono", monospace',
          fontSize: 12,
        }}
      />
    </div>
  );
};

export default CodeEditor;
