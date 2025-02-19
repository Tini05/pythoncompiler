import { time, motion } from "framer-motion";
import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Button, Container, Row, Col, Card, Form, Modal } from "react-bootstrap";
import FileSaver from "file-saver";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import python from "react-syntax-highlighter/dist/esm/languages/hljs/python";

SyntaxHighlighter.registerLanguage("python", python);

const App: React.FC = () => {
  const [code, setCode] = useState<string>("");
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInputRequired, setIsInputRequired] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // To keep track of textarea ref
  const [isSticky, setIsSticky] = useState(false);
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [originalX, setOriginalX] = useState(0);
  const [width, setWidth] = useState(0);

  // Ensure correct position before rendering
  useLayoutEffect(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setOriginalX(rect.left); // Store the original left position
      setWidth(rect.width); // Store original width
    }

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCodeChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(event.target.value);
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCode(e.target?.result as string);
      reader.readAsText(file);
    }
  };

  const applyTemplate = (template: string) => {
    setCode(template);
    setShowTemplates(false);
  };

  const extractPromptsFromCode = (code: string) => {
    const promptRegex = /input\(["'](.*?)["']\)/g;
    let prompts: string[] = [];
    let match;
    while ((match = promptRegex.exec(code)) !== null) {
      prompts.push(match[1]);
    }
    return prompts;
  };

  const handleRunCode = async () => {
    if (isLoading === true) return;
    setIsLoading(true);
    setTerminalHistory((prev) => [...prev, ">>> Running..."]);

    const prompts = extractPromptsFromCode(code);
    console.log("Prompts to be displayed:", prompts);

    try {
      console.log("🔄 Sending request to run code...");
      for (let i = 0; i < prompts.length; i++) {
        if (prompts[i]) {
          setTerminalHistory((prev) => [...prev, prompts[i]]);
        }
      }

      const response = await fetch("http://localhost:5000/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      console.log("✅ Received response from /run");
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true }).trim();
          console.log(`📜 Received chunk: "${chunk}"`);

          if (prompts.length > 0) {
            let updatedChunk = chunk;
            let updNew: string[] = [];
            for (let i = prompts.length-1; i >= 0; i--) {
              if (updatedChunk.includes(prompts[i])) {
                console.log(updatedChunk);
                let updNew = updatedChunk.split(prompts[i]);  
                updatedChunk = updNew[1];         
              }
            }
            if (updNew.length > 2){
              updatedChunk = updNew[updNew.length-1];
            }
            setTerminalHistory((prev) => [...prev, updatedChunk]);
            setIsInputRequired(true);
            setIsLoading(false);
          } else {
            if (chunk.trim() !== "") {
              setTerminalHistory((prev) => [...prev, chunk]);
            }
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error running the code:", error);
      setTerminalHistory((prev) => [...prev, "Error running the code"]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInput = async () => {
    if (!inputValue.trim()) return;

    console.log(`🔄 Sending input: "${inputValue}"`);
    setTerminalHistory((prev) => [...prev, `>>> ${inputValue}`]);

    
    if (isLoading === false){
      if (inputValue.trim() === "save") {
        const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
        FileSaver.saveAs(blob, "code.py");
        setTerminalHistory((prev) => [...prev, "File saved as code.py"]);
        setInputValue("");
        return;
      }

      if (inputValue.trim() === "clear") {
        setTerminalHistory([]);
        setInputValue("");
        return;
      }

      if (inputValue.trim() === "new") {
        setCode("");
        setTerminalHistory((prev) => [...prev, "Code editor cleared"]);
        setInputValue("");
        return;
      }

      if (inputValue.trim() === "help") {
        setTerminalHistory((prev) => [
          ...prev,
          "Available commands:",
          "save - Saves the current code as a .py file",
          "clear - Clears the terminal history",
          "new - Clears the code editor",
          "help - Shows this help message"
        ]);
        setInputValue("");
        return;
      }

      setInputValue("");
      return;
    }

    const prompts = extractPromptsFromCode(code);

    try {
      const response = await fetch("http://localhost:5000/send_input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputValue.trim() }),
      });

      console.log(`✅ Received response from /send_input (Status: ${response.status})`);
      
      if (!response.ok) {
        setTerminalHistory((prev) => [...prev, "Error: No running process"]);
        setInputValue("");
        return;
      }

      const data = await response.json();
      console.log(`📜 Received output: "${data.output}"`);
      
      if (prompts.length > 0) {
        let updatedChunk = data.output;
        let updNew: string[] = [];
        for (let i = prompts.length; i >= 0; i--) {
          if (updatedChunk.includes(prompts[i])) {
            console.log(updatedChunk);
            let updNew = updatedChunk.split(prompts[i]);  
            updatedChunk = updNew[1];       
          }        
        }
        if (updNew.length > 2){
          updatedChunk = updNew[updNew.length-1];
        }
        console.log(updatedChunk);
        setTerminalHistory((prev) => [...prev, updatedChunk]);
        setInputValue("");
      } else {
        console.log(data.output);
        if (data.output.trim() !== "") {
          setTerminalHistory((prev) => [...prev, data.output]);
        }
        setIsLoading(false);
        setInputValue("");
      }

      setInputValue("");
    } catch (error) {
      console.error("❌ Error sending input:", error);
      setTerminalHistory((prev) => [...prev, "Error sending input"]);
      setIsLoading(false);
      setInputValue("");
    }
  };

  // Handle dynamic resizing for textarea (height only)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // Reset height to auto
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Adjust to fit content
    }
  }, [code]); // Adjust when code changes

  const editorRef = useRef<HTMLDivElement>(null); // Define ref for the code editor container

  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (editorRef.current && e.key === 'Tab') {
        e.preventDefault(); // Prevent default tabbing behavior

        // Find all textarea elements inside the editorRef
        const elements = Array.from(editorRef.current.querySelectorAll('textarea')) as HTMLTextAreaElement[];

        // Find the currently focused element
        const currentIndex = elements.indexOf(document.activeElement as HTMLTextAreaElement);

        if (currentIndex === -1) return; // If no element is focused, exit early

        // Determine the next element to focus
        let nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;

        // Cycle through the elements if we reach the end or the start
        if (nextIndex < 0) nextIndex = elements.length - 1;
        if (nextIndex >= elements.length) nextIndex = 0;

        // Move focus to the next element
        elements[nextIndex].focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
    };
  }, []);

  return (
    <Container fluid className={`d-flex flex-column min-vh-100 ${isDarkMode ? "bg-dark text-white" : "bg-white"}`}>
      <Row className="py-4 bg-primary text-white text-center">
      <Col>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.99 }}>
            <h1 className="display-4 fw-bold">Python Code Compiler</h1>
          </motion.div>
        </Col>
        <Col className="text-end">
          <div
            className={`d-inline-flex align-items-center p-1 rounded-pill cursor-pointer transition ${
              isDarkMode ? "bg-dark" : "bg-light"
            }`}
            style={{
              width: "50px",
              height: "25px",
              cursor: "pointer",
              transition: "background 0.3s",
            }}
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            <div
              className="bg-secondary .bg-gradient rounded-circle shadow"
              style={{
                width: "20px",
                height: "20px",
                transform: isDarkMode ? "translateX(25px)" : "translateX(0px)",
                transition: "transform 0.3s",
              }}
            ></div>
          </div>
        </Col>
      </Row>
      <Row className="py-2">
        {/* <Col className="position-relative">  
          
        </Col> */}
      </Row>
      <Row className="flex-grow-1 d-flex align-items-start py-2">
      <Col md={6} className="mb-3" >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Card className="shadow-lg border-0 position-relative">
            <Card.Header className={`text-white fw-semibold ${isDarkMode ? "bg-primary" : "bg-dark"} text-white`}>
              Code Editor
            </Card.Header>
            <Card.Body className="position-relative">
              <motion.textarea
                ref={textareaRef}
                tabIndex={0}
                value={code}
                onChange={handleCodeChange}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault(); // Stop focus from moving out
              
                    // Get the cursor position
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
              
                    // Insert tab at cursor position
                    const newValue =
                      code.substring(0, start) + "\t" + code.substring(end);
              
                    // Update the text and move the cursor
                    handleCodeChange({
                      target: { value: newValue }
                    } as React.ChangeEvent<HTMLTextAreaElement>);
              
                    setTimeout(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 1;
                    }, 0);
                  }
                }}
                style={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "16px",
                  padding: "10px",
                  background: "transparent",
                  color: "transparent",
                  border: "1px solid #755e5e",
                  whiteSpace: "pre-wrap",
                  overflowY: "hidden",
                  position: "absolute",
                  zIndex: 2,
                  top: 0,
                  left: 0,
                  display: "flex",
                  caretColor: "gray",
                  minHeight: "auto",
                  maxHeight: "none",
                  overflowX: "hidden",
                  resize: "none",
                  userSelect: "none",
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              />
              <SyntaxHighlighter
                language="python"
                style={docco}
                showLineNumbers={false}
                customStyle={{
                  width: "100%",
                  fontFamily: "monospace",
                  fontSize: "16px",
                  padding: "10px",
                  color: `${isDarkMode ? "white" : "black"}`,
                  backgroundColor: `${isDarkMode ? "black" : "white"}`,
                  background: `${isDarkMode ? "black" : "white"}`,
                  whiteSpace: "pre-wrap",
                  overflowY: "hidden",
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "flex",
                  zIndex: 1,
                  minHeight: "auto",
                  maxHeight: "none",
                }}
              >
                {code}
              </SyntaxHighlighter>
            </Card.Body>
          </Card>
        </motion.div>
      </Col>
        <Col md={6} className="mb-3 position-relative" tabIndex={-1}>
          <motion.div  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="shadow-lg border-0" tabIndex={-1}>
              <Card.Header className={`fw-semibold ${isDarkMode ? "bg-secondary" : "bg-dark"} text-white`}>Terminal</Card.Header>
              <Card.Body className="bg-black text-success font-monospace p-3" style={{ height: "250px", overflowY: "auto" }}>
                {terminalHistory.map((line, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>{line}</motion.div>
                ))}
              </Card.Body>
              <div className="d-flex align-items-center bg-secondary p-2">
                  <span className="text-info me-2">{">>>"}</span>
                  <input
                    type="text"
                    value={inputValue}
                    style={{ color: "white", borderColor: "black" }}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendInput(); }}
                    className="bg-transparent border-2 w-100 font-monospace"
                    autoFocus
                  />
                </div>
            </Card>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button variant="success" className="fw-bold px-4 py-2 shadow p-3 mt-3" onClick={handleRunCode} disabled={isLoading}>
              <motion.span animate={{ scale: isLoading ? [1, 1.1, 1] : 1 }} transition={{ repeat: Infinity, duration: 0.5 }}>
                {isLoading ? "Running..." : "Run Code"}
              </motion.span>
            </Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="position-absolute bottom-0 end-0 mx-1">
            <Button variant="warning" onClick={() => setShowUpload(true)} className="fw-bold px-6 py-2 shadow p-3 mt-3">
              Upload Script
            </Button>
            <Button variant="info" onClick={() => setShowTemplates(true)} className="fw-bold px-6 py-2 shadow p-3 mt-3 mx-2">
              Code Snippets
            </Button>
          </motion.div>
        </Col>
      </Row>
      <Modal show={showTemplates} onHide={() => setShowTemplates(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Code Snippets</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate('print("Hello, World!")')}>Hello World</Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate("for i in range(5):\n\tprint(i)")}>Loop Example</Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate('x = int(input("Enter a number: "))\nif x > 0:\n\tprint("Positive")\nelif x < 0:\n\tprint("Negative")\nelse:\n\tprint("Zero")')}>Basic Conditions</Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate('def greet(name):\n\treturn f"Hello, {name}!"\nprint(greet("Alice"))')}>Function Example</Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate("squares = [x**2 for x in range(10)]\nprint(squares)")}>List Example</Button>
          </motion.div>
          <motion.div style={{display: "inline-block"}} whileHover={{ scale: 1.05 }} whileTap={{ scale: .98 }}>
            <Button variant="outline-primary" className="m-2" onClick={() => applyTemplate('class Person:\n\tdef __init__(self, name):\n\t\tself.name = name\n\tdef greet(self):\n\t\treturn f"Hello, my name is {self.name}!"\np = Person("Alice")\nprint(p.greet())')}>Class/Object Example</Button>
          </motion.div>
        </Modal.Body>
      </Modal>
      <Modal show={showUpload} onHide={() => setShowUpload(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Python Script</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Control type="file" accept=".py" onChange={handleUpload} />
          </Form.Group>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default App;
