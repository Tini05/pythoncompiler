import React, { useState } from 'react';
import { Row, Col, Form, Button } from 'react-bootstrap';
import axios from 'axios';

const Terminal: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [code, setCode] = useState('');

  // Function to run Python code in backend
  const runPythonCode = async () => {
    try {
      const response = await axios.post('http://localhost:5000/run', { code });
      setOutput([...output, response.data.output]);
    } catch (error) {
      setOutput([...output, 'Error executing code']);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const executeCommand = async () => {
    switch (input) {
      case 'run':
        await runPythonCode();
        break;
      case 'new':
        setCode('');
        setOutput(['Code cleared']);
        break;
      case 'clear':
        setOutput([]);
        break;
      case 'help':
        setOutput([
          'Available commands:',
          'new - Clears the code editor',
          'clear - Clears the terminal',
          'help - Shows this help message',
          'run - Executes the Python code',
          'download - Downloads your code as a .py file',
        ]);
        break;
      case 'download':
        downloadCode();
        break;
      default:
        setOutput([...output, `Unknown command: ${input}`]);
        break;
    }
    setInput('');
  };

  const downloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'code.py';
    element.click();
  };

  return (
    <div className="terminal">
      <Row>
        <Col>
          <div className="terminal-output">
            {output.map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          <div className="terminal-input">
            <Form.Control
              value={input}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
              placeholder="Enter command"
            />
            <Button variant="primary" onClick={executeCommand}>
              Run Command
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Terminal;
