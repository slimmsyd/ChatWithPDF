"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useSession } from "next-auth/react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { 
  Send, 
  Upload, 
  FileText, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  AlertCircle,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PDFIcon } from "@/components/icons/PDFIcon";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from 'react-markdown';

// Define the Flask API base URL
// const API_BASE_URL =  "http://localhost:8000";
const API_BASE_URL = "http://agentp-Publi-bWOcL63CIdjh-1015568917.us-east-1.elb.amazonaws.com";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export default function ReadPDFPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userProfile = useUserProfile();
  const { toast } = useToast();
  
  // Add state for PDF session ID
  const [pdfSessionId, setPdfSessionId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropAreaRef = useRef<HTMLDivElement>(null);

  const handleNavigation = (page: string) => {
    router.push(`/app/${page}`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processFile(file);
  };

  const processFile = async (file?: File) => {
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      setDragError("Only PDF files are accepted");
      setTimeout(() => setDragError(null), 3000);
      return;
    }
    
    // Create object URL for display
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfName(file.name);
    
    // Set processing state
    setIsProcessing(true);
    
    try {
      // Create form data for API call
      const formData = new FormData();
      formData.append('file', file);
      
      // Call the Flask API to process the PDF
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process PDF');
      }
      
      const data = await response.json();
      
      // Store the session ID for future queries
      setPdfSessionId(data.session_id);
      
      // System message to inform PDF is loaded
      const loadedMessage: Message = {
        id: Date.now().toString(),
        content: `PDF "${file.name}" has been processed. You can now ask questions about it.`,
        role: "assistant",
        timestamp: new Date()
      };
      
      // Add the automatic summary message
      const summaryMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `📄 **Summary of the document**: \n\n${data.summary || "No summary available"}`,
        role: "assistant",
        timestamp: new Date()
      };
      
      // Add both messages
      setMessages(prev => [...prev, loadedMessage, summaryMessage]);
      
      toast({
        title: "PDF Processed",
        description: "Your PDF has been processed successfully.",
        variant: "default",
      });
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: `There was an error processing "${file.name}". Please try again.`,
        role: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to process PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setDragError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !pdfUrl || !pdfSessionId) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call the Flask API to query the PDF
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: pdfSessionId,
          question: userMessage.content,
          structured: false, // Use simple answers for chat
          chat_history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      const data = await response.json();
      
      // Add AI response message
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: data.answer,
        role: "assistant",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error querying PDF:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Sorry, I couldn't process your question. Please try again.",
        role: "assistant",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error",
        description: "Failed to get an answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
   // Reserved for any future scrolling behaviors or other effects
  }, [isLoading]);
  
  const handleReset = () => {
    setPdfUrl(null);
    setPdfName(null);
    setPdfSessionId(null);
    setMessages([]);
    setInputMessage("");
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-screen bg-white">
      <DashboardSidebar 
        activePage="readPDF" 
        onNavigate={handleNavigation}
        userName={userProfile?.user?.name?.split(" ")[0] || "User"}
        userAvatar={userProfile?.user?.profileImage || ""}
        rewardPoints={10}
      />
      
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Main PDF Viewer Panel */}
        <ResizablePanel defaultSize={70} minSize={40} className="flex-1">
          <main className="flex flex-col h-full bg-[#F0EFFF]/10">
            {/* Header - only shown when no PDF is loaded */}
            {!pdfUrl && (
              <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
                <h1 className="text-xl font-semibold text-gray-800 flex items-center">
                  <PDFIcon className="h-5 w-5 mr-2 text-[#2BAC3E]" />
                  PDF Reader
                </h1>
                <p className="text-sm text-gray-500">Upload a PDF and chat with it</p>
              </div>
            )}
            
            <div className="flex-1 p-4 overflow-auto">
              {!pdfUrl ? (
                <div 
                  ref={dropAreaRef}
                  className="flex flex-col items-center justify-center h-full"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Card 
                    className={`w-full max-w-md border-dashed border-2 ${
                      dragActive 
                        ? 'border-[#2BAC3E] bg-[#2BAC3E]/5' 
                        : dragError 
                          ? 'border-red-400 bg-red-50' 
                          : 'border-gray-300 bg-gray-50'
                    } transition-colors duration-200`}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                      {dragError ? (
                        <div className="text-red-500 flex items-center gap-2">
                          <AlertCircle className="h-5 w-5" />
                          <p>{dragError}</p>
                        </div>
                      ) : (
                        <>
                          <PDFIcon className={`h-16 w-16 ${dragActive ? 'text-[#2BAC3E]' : 'text-gray-400'}`} />
                          <CardTitle className={`text-xl font-medium ${dragActive ? 'text-[#2BAC3E]' : 'text-gray-700'}`}>
                            {dragActive ? 'Drop PDF here' : 'Upload a PDF'}
                          </CardTitle>
                        </>
                      )}
                      <p className="text-sm text-gray-500 text-center">
                        {dragActive 
                          ? 'Release to upload your PDF file' 
                          : 'Drag and drop a PDF file here, or click the button below to select one'}
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-[#2BAC3E] hover:bg-[#1F8A2F] text-white"
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Select PDF
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="h-full w-full relative">
                  <Button 
                    onClick={handleReset}
                    variant="outline" 
                    size="icon"
                    className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="absolute top-2 left-2 z-10 bg-white/80 py-1 px-3 rounded-md text-sm font-medium">
                    {pdfName}
                  </div>
                  <iframe 
                    src={`${pdfUrl}#toolbar=0`} 
                    className="w-full h-full border border-gray-200 rounded-lg"
                    title="PDF Viewer"
                  />
                </div>
              )}
            </div>
          </main>
        </ResizablePanel>
        
        <ResizableHandle withHandle className="bg-gray-200 border-l border-r border-gray-300" />
        
        {/* Chat Panel */}
        <ResizablePanel defaultSize={30} minSize={25} maxSize={50} className="flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-[#2BAC3E]" />
              Chat with PDF
            </h2>
            {pdfSessionId ? (
              <div className="mt-1 flex items-center text-xs text-green-600">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                PDF processed and ready for questions
              </div>
            ) : pdfUrl && isProcessing ? (
              <div className="mt-1 flex items-center text-xs text-orange-600">
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Processing PDF...
              </div>
            ) : null}
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {messages.length === 0 && !pdfUrl ? (
                  <motion.div
                    key="upload-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-64 text-center"
                  >
                    <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 max-w-xs">
                      Upload a PDF to start chatting
                    </p>
                  </motion.div>
                ) : messages.length === 0 && pdfUrl ? (
                  <motion.div
                    key="ask-prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-64 text-center"
                  >
                    <PDFIcon className="h-12 w-12 text-[#2BAC3E]/30 mb-4" />
                    <p className="text-gray-500 max-w-xs">
                      {isProcessing ? "Processing PDF..." : "Ask questions about the PDF content"}
                    </p>
                  </motion.div>
                ) : (
                  messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === "user" 
                            ? "bg-[#2BAC3E] text-white" 
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <div className="text-sm prose prose-sm max-w-none">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                        <p className="text-xs mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
                {isLoading && (
                  <motion.div
                    key="thinking-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 rounded-lg p-3 flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      <p className="text-sm text-gray-500">Thinking...</p>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </AnimatePresence>
            </div>
          </ScrollArea>
          
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex space-x-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={pdfSessionId ? "Ask a question about the PDF..." : isProcessing ? "Processing PDF..." : "Upload a PDF first"}
                disabled={!pdfSessionId || isLoading || isProcessing}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 border-gray-300 focus:ring-[#2BAC3E] focus:border-[#2BAC3E]"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!pdfSessionId || !inputMessage.trim() || isLoading || isProcessing}
                className="bg-[#2BAC3E] hover:bg-[#1F8A2F] text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
