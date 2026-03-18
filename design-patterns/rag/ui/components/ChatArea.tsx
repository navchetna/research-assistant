import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  Paper,
  Collapse,
  Fade,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import axios from 'axios';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { CHAT_QNA_URL } from '@/lib/constants';
import AudioRecorder from './AudioRecorder';

interface Metrics {
  ttft: number;
  output_tokens: number;
  throughput: number;
  e2e_latency: number;
}

interface Message {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  timestamp: string;
  quality?: 'good' | 'bad';
  sources?: Array<{
    source: string;
    relevance_score: number;
    content: string;
  }>;
  metrics?: Metrics | null;
  isPending?: boolean;
  isStreaming?: boolean;
  isThinking?: boolean;
}

interface ChatAreaProps {
  conversationId: string | null;
  onTogglePDFViewer: () => void;
  isPDFViewerOpen: boolean;
  isCollapsed: boolean;
  onCollapseChange: (collapsed: boolean) => void;
  onContextChange: (context: string) => void;
  onSelectConversation: (id: string) => void;
  onConversationUpdated?: () => void;
  updateConversationList?: () => void;
}

export default function ChatArea({
  conversationId,
  onSelectConversation,
  onConversationUpdated,
  updateConversationList
}: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReferences, setShowReferences] = useState<{ [key: string]: boolean }>({});
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const [showNewChatPrompt, setShowNewChatPrompt] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorSnackbar, setShowErrorSnackbar] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [streamingContent, setStreamingContent] = useState<{ [key: string]: string }>({});
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const displayMessages = currentConversationId
    ? [...messages, ...localMessages.filter(msg => msg.isPending || msg.isStreaming)]
    : localMessages;

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);
  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, streamingContent]);

  useEffect(() => {
    if (conversationId) {
      setCurrentConversationId(conversationId);
      loadConversation(conversationId);
      setShowWelcome(false);
      setLocalMessages([]);
    } else {
      setShowNewChatPrompt(true);
      setMessages([]);
      setShowWelcome(true);
      setCurrentConversationId(null);
      setLocalMessages([]);
    }
  }, [conversationId]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await axios.get(`${CHAT_QNA_URL}/api/conversations/${id}?db_name=rag_db`);
      const data = response.data;
      console.log('Loaded conversation data:', data);

      if (!data.history || !Array.isArray(data.history) || data.history.length === 0) {
        console.warn('History is missing, empty, or not an array in conversation data', data);
        return;
      }

      const formattedMessages: Message[] = [];
      data.history.forEach((turn: any, index: number) => {
        if (turn.question) {
          const questionContent = typeof turn.question === 'string'
            ? turn.question
            : turn.question.content || '';

          const timestamp = turn.question.timestamp ||
            turn.timestamp ||
            new Date().toISOString();

          formattedMessages.push({
            id: `${timestamp}-user-${index}`,
            role: 'user',
            content: questionContent,
            timestamp: timestamp,
          });
        }

        if (turn.answer) {
          const answerContent = typeof turn.answer === 'string'
            ? turn.answer
            : turn.answer.content || '';

          const timestamp = turn.answer.timestamp ||
            (Number(new Date(turn.timestamp || 0)) + 1).toString() ||
            new Date().toISOString();

          formattedMessages.push({
            id: `${timestamp}-assistant-${index}`,
            role: 'assistant',
            content: answerContent,
            timestamp: timestamp,
            sources: turn.sources || turn.context || [],
            metrics: turn.metrics || null
          });
        }
      });

      console.log('Formatted messages:', formattedMessages);

      if (formattedMessages.length > 0) {
        setMessages(formattedMessages);
        setLocalMessages([]);
      }

    } catch (error: unknown) {
      console.error('Error loading conversation:', error);
      let errorMessage = 'Error loading conversation data';

      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.message || error.message || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setErrorMessage(errorMessage);
      setShowErrorSnackbar(true);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = async (userMessageContent: string): Promise<string | null> => {
    try {
      const response = await axios.post(`${CHAT_QNA_URL}/api/conversations/new`, {
        db_name: 'rag_db'
      });

      const data = await response.data;
      console.log('Created new conversation:', data);

      const newConversationId = data.conversation_id;
      setCurrentConversationId(newConversationId);
      onSelectConversation(newConversationId);

      if (onConversationUpdated) {
        onConversationUpdated();
      }

      return newConversationId;
    } catch (error) {
      console.error('Error creating conversation:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create a new conversation');
      setShowErrorSnackbar(true);
      setShowNewChatPrompt(true);

      setLocalMessages(prev =>
        prev.map(msg =>
          msg.isPending ? { ...msg, isPending: false } : msg
        )
      );

      setIsLoading(false);
      return null;
    }
  };

  const sendMessage = async (messageContent: string, targetConversationId: string) => {
    setIsLoading(true);

    if (streamingEnabled) {
      try {
        const streamingMessageId = `streaming-${Date.now()}`;
        setStreamingMessageId(streamingMessageId);
        
        let fullResponseText = '';
        let responseMetrics: Metrics | null = null;
        let sourcesFromResponse: Array<{ source: string; relevance_score: number; content: string; }> = [];

        setMessages(prev => [...prev, {
          id: streamingMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true,
          isThinking: true
        }]);

        const response = await fetch(`${CHAT_QNA_URL}/api/conversations/${targetConversationId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: messageContent,
            db_name: "rag_db",
            stream: true
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('ReadableStream not supported');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }
          const chunk = decoder.decode(value, { stream: true });

          const metricsMatch = chunk.match(/__METRICS__(.*?)__METRICS__/);
          if (metricsMatch) {
            try {
              const metricsData = JSON.parse(metricsMatch[1]);
              responseMetrics = metricsData.metrics;
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === streamingMessageId
                    ? { 
                        ...msg, 
                        metrics: responseMetrics,
                      }
                    : msg
                )
              );
              
              fullResponseText += chunk.replace(/__METRICS__(.*?)__METRICS__/, '');
            } catch (e) {
              console.error('Failed to parse metrics:', e);
              fullResponseText += chunk;
            }
          } else {
            fullResponseText += chunk;
          }

          const formattedText = fullResponseText
            .replace(/\r\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n');

          if (formattedText.trim() !== '') {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === streamingMessageId
                  ? { 
                      ...msg, 
                      content: formattedText,
                      isThinking: false
                    }
                  : msg
              )
            );
          } else {
            setMessages(prev =>
              prev.map(msg =>
                msg.id === streamingMessageId
                  ? { ...msg, content: formattedText }
                  : msg
              )
            );
          }
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === streamingMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  isThinking: false,
                  metrics: responseMetrics
                }
              : msg
          )
        );

        axios.get(`${CHAT_QNA_URL}/api/conversations/${targetConversationId}?db_name=rag_db`)
          .then(response => {
            if (response.data && response.data.history && response.data.history.length > 0) {
              const latestTurn = response.data.history.filter((turn: { question: string; sources?: any[] }) => 
                turn.question === messageContent
              ).pop();
              
              if (latestTurn && latestTurn.sources) {
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === streamingMessageId
                      ? {
                          ...msg,
                          sources: latestTurn.sources
                        }
                      : msg
                  )
                );
              }
            }
          })
          .catch(error => {
            console.error("Error fetching conversation with sources:", error);
          });

        setIsLoading(false);
        setStreamingMessageId(null);
      } catch (error) {
        console.error("Error in streaming response:", error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to get streaming response');
        setShowErrorSnackbar(true);
        setIsLoading(false);
        setStreamingMessageId(null);
      }
    }

    if (typeof updateConversationList === 'function') {
      updateConversationList();
    }
  };


  const handleQualityChange = (messageId: string, newQuality: 'good' | 'bad') => {
    const isLocal = localMessages.some(msg => msg.id === messageId);

    if (isLocal) {
      setLocalMessages(prevMessages =>
        prevMessages.map(message =>
          message.id === messageId
            ? { ...message, quality: newQuality }
            : message
        )
      );
    } else {
      setMessages(prevMessages =>
        prevMessages.map(message =>
          message.id === messageId
            ? { ...message, quality: newQuality }
            : message
        )
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement> | string) => {
    if (typeof e !== 'string' && e?.preventDefault) {
      e.preventDefault();
    }

    const messageContent = typeof e === 'string' ? e : input;
    if (!messageContent.trim() || isLoading) return;

    setShowWelcome(false);
    setErrorMessage(null);

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date().toISOString(),
      isPending: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (currentConversationId) {
        await sendMessage(messageContent.trim(), currentConversationId);
      } else {
        setShowNewChatPrompt(false);
        const newConversationId = await startNewConversation(messageContent.trim());
        if (newConversationId) {
          setCurrentConversationId(newConversationId);
          await sendMessage(messageContent.trim(), newConversationId);
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send message');
      setShowErrorSnackbar(true);
      setIsLoading(false);
    }
  };

  const toggleReferences = (messageId: string) => {
    setShowReferences(prev => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const copyToClipboard = (text: string): Promise<void> => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      return new Promise((resolve, reject) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (successful) {
            resolve();
          } else {
            reject(new Error('Unable to copy text'));
          }
        } catch (err) {
          document.body.removeChild(textArea);
          reject(err);
        }
      });
    }
  };

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await copyToClipboard(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };


  const toggleSourcesVisibility = (messageId: string) => {
    setShowReferences(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const handleTranscription = (text: string) => {
    if (text.trim()) {
      setInput(prev => {
        if (prev.trim()) {
          return `${prev.trim()} ${text.trim()}`;
        }
        return text.trim();
      });
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
        background: `
          radial-gradient(ellipse at 20% 0%, rgba(0, 113, 197, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 100%, rgba(41, 217, 255, 0.05) 0%, transparent 50%),
          linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)
        `,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1100px',
          width: '100%',
          mx: 'auto',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            px: { xs: 2, sm: 4 },
            pt: 4,
            pb: 2,
            gap: 1.5,
          }}
        >
          {displayMessages.map((message, index) => (
            <Fade in key={message.id}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 2,
                  opacity: message.isPending ? 0.7 : 1,
                  justifyContent: 'flex-start',
                  mt: index > 0 && message.role === 'user' && displayMessages[index - 1].role === 'assistant' ? 3 : 0,
                  mb: message.role === 'user' ? 0.5 : 0,
                }}
              >
                {message.role === 'user' ? (
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #0071C5 0%, #29D9FF 100%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      mt: 1,
                      flexShrink: 0,
                    }}
                  >
                    <AccountCircleIcon
                      sx={{
                        fontSize: 22,
                        color: '#fff',
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #e8f0fe 0%, #d4e4fc 100%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      alignSelf: 'flex-start',
                      mt: 1,
                      flexShrink: 0,
                    }}
                  >
                    <AutoAwesomeIcon
                      sx={{
                        fontSize: 20,
                        color: '#0071C5',
                      }}
                    />
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    width: '100%',
                    alignSelf: 'flex-start',
                  }}
                >
                  {message.role === 'user' ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        maxWidth: '100%',
                        borderRadius: '16px 16px 16px 4px',
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #dceefb 100%)',
                        border: '1px solid rgba(0, 113, 197, 0.12)',
                        position: 'relative',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          color: '#333',
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {message.content}
                      </Typography>
                    </Paper>
                  ) : (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        mt: 0.5,
                        width: '100%',
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          maxWidth: '100%',
                          width: '100%',
                          borderRadius: '16px 16px 16px 4px',
                          backgroundColor: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                          position: 'relative',
                        }}
                      >
                        <Box
                          sx={{
                            color: '#333',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                            mt: 0,
                            mb: 0,
                          }}
                        >
                          {message.isThinking ? (
                            <Box
                              sx={{
                                color: '#333',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                display: 'flex',
                                alignItems: 'center',
                                m: 0,
                                p: 0,
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Box
                                  sx={{
                                    display: 'inline-flex',
                                    gap: '3px',
                                    position: 'relative',
                                    top: '2px',
                                  }}
                                >
                                  {[0, 1, 2].map((i) => (
                                    <Box
                                      key={i}
                                      component="span"
                                      sx={{
                                        width: '3px',
                                        height: '3px',
                                        borderRadius: '50%',
                                        backgroundColor: 'rgba(25, 118, 210, 0.6)',
                                        animation: `thinkingDot 1.2s infinite ease-in-out ${i * 0.15}s`,
                                        '@keyframes thinkingDot': {
                                          '0%, 100%': {
                                            transform: 'translateY(0)',
                                            opacity: 0.5,
                                          },
                                          '50%': {
                                            transform: 'translateY(-2px)',
                                            opacity: 0.9,
                                          },
                                        },
                                      }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                color: '#333',
                                lineHeight: 1.5,
                                whiteSpace: 'pre-wrap',
                                m: 0,
                                p: 0,
                                '& p': { marginBottom: '0.8em', marginTop: 0 },
                                '& p:last-child': { marginBottom: 0 },
                              }}
                            >
                              {message.isStreaming ? (
                                <>
                                  {message.content.split('\n').map((paragraph, idx) => (
                                    paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                                  ))}
                                </>
                              ) : (
                                <>
                                  {message.content.split('\n\n').map((paragraph, idx) => (
                                    <p key={idx}>{paragraph}</p>
                                  ))}
                                </>
                              )}
                            </Box>
                          )}
                        </Box>

                        <Box sx={{
                          display: 'flex',
                          mt: 1.5,
                          width: '100%',
                          position: 'relative'
                        }}>
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-start' }}>
                            {!message.isStreaming && (
                              <>
                                <Tooltip title={copiedMessageId === message.id ? "Copied!" : "Copy response"}>
                                  <IconButton
                                    onClick={() => handleCopy(message.content, message.id)}
                                    size="small"
                                    color={copiedMessageId === message.id ? "primary" : "default"}
                                  >
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Helpful">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleQualityChange(message.id, 'good')}
                                    color={message.quality === 'good' ? 'primary' : 'default'}
                                  >
                                    <ThumbUpIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Not helpful">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleQualityChange(message.id, 'bad')}
                                    color={message.quality === 'bad' ? 'error' : 'default'}
                                  >
                                    <ThumbDownIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                {message.sources && message.sources.length > 0 && (
                                  <Tooltip title="View sources">
                                    <IconButton
                                      size="small"
                                      onClick={() => toggleReferences(message.id)}
                                    >
                                      <DescriptionIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                          </Box>

                          {message.metrics && (
                            <Box sx={{
                              position: 'absolute',
                              right: 0,
                              bottom: 0,
                              transition: 'opacity 0.3s ease-in-out'
                            }}>
                              <Tooltip
                                title={
                                  <Box sx={{ p: 1 }}>
                                    <Typography variant="caption" display="block">
                                      Time to First Token: {message.metrics.ttft.toFixed(3)}s
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Throughput: {message.metrics.throughput.toFixed(3)} t/s
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Output tokens: {message.metrics.output_tokens}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      End-to-End Latency: {message.metrics.e2e_latency.toFixed(3)}s
                                    </Typography>
                                  </Box>
                                }
                              >
                                <IconButton size="small">
                                  <InfoOutlinedIcon 
                                    fontSize="small" 
                                    sx={{ mt: 1, color: 'text.secondary' }} 
                                  />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>

                      </Paper>
                    </Box>
                  )}

                  {message.role === 'assistant' && message.sources && (
                    <Collapse in={showReferences[message.id]} sx={{ mt: 1, maxWidth: '100%' }}>
                      <Box
                        sx={{
                          backgroundColor: '#f8f9fa',
                          borderRadius: 2,
                          p: 2,
                          border: '1px solid #e0e0e0',
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ mb: 1, color: '#2c2c2c' }}>
                          Sources
                        </Typography>
                        {message.sources?.map((source, index) => (
                          <Box key={index} sx={{ mb: 2, '&:last-child': { mb: 0 } }}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                color: '#1976d2',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                mb: 0.5
                              }}
                            >
                              {source.source} (Score: {source.relevance_score.toFixed(2)})
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: '#666',
                                fontSize: '0.8rem',
                                lineHeight: 1.4
                              }}
                            >
                              {source.content}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  )}
                </Box>
              </Box>
            </Fade>
          ))}

          {showWelcome && (
            <Fade in timeout={800}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '80vh',
                  textAlign: 'center',
                  px: 3,
                }}
              >
                <Box
                  sx={{
                    maxWidth: 750,
                    width: '100%',
                    backgroundColor: '#fff',
                    borderRadius: 4,
                    p: 3,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                >
                  <Typography variant="h4" sx={{ mb: 1, color: '#0071C5', fontWeight: 'bold' }}>
                    Welcome to Research Assistant
                  </Typography>

                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 3,
                    mb: 4
                  }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(0, 113, 197, 0.08)',
                        border: '1px solid rgba(0, 113, 197, 0.2)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 20px rgba(0, 113, 197, 0.15)',
                          backgroundColor: 'rgba(0, 113, 197, 0.12)',
                        }
                      }}
                    >
                      <SearchIcon sx={{ fontSize: 32, color: '#0071C5', mb: 1 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.95rem' }}>
                        Search Research Papers
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Find and explore academic papers from top journals and conferences
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(255, 152, 0, 0.08)',
                        border: '1px solid rgba(255, 152, 0, 0.2)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 20px rgba(255, 152, 0, 0.15)',
                          backgroundColor: 'rgba(255, 152, 0, 0.12)',
                        }
                      }}
                    >
                      <FileUploadIcon sx={{ fontSize: 32, color: '#0071C5', mb: 1 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.95rem' }}>
                        File Upload
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Upload research papers and documents for AI-powered analysis
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(228, 217, 111, 0.08)',
                        border: '1px solid rgba(228, 217, 111, 0.2)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 20px rgba(228, 217, 111, 0.15)',
                          backgroundColor: 'rgba(228, 217, 111, 0.12)',
                        }
                      }}
                    >
                      <SummarizeOutlinedIcon sx={{ fontSize: 32, color: '#E4D96F', mb: 1 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.95rem' }}>
                        Conversation Summaries
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        Get instant summaries of your research discussions
                      </Typography>
                    </Paper>

                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        backgroundColor: 'rgba(233, 30, 99, 0.08)',
                        border: '1px solid rgba(233, 30, 99, 0.2)',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 12px 20px rgba(233, 30, 99, 0.15)',
                          backgroundColor: 'rgba(233, 30, 99, 0.12)',
                        }
                      }}
                    >
                      <PictureAsPdfIcon sx={{ fontSize: 32, color: '#E91E63', mb: 1 }} />
                      <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.95rem' }}>
                        PDF Context Viewer
                      </Typography>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        View the exact sources the AI uses to generate responses
                      </Typography>
                    </Paper>
                  </Box>

                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, fontSize: '0.85rem' }}>
                      Type a question in the chat box below or ask about any research topic
                    </Typography>

                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'translateY(0)' },
                        '50%': { transform: 'translateY(-8px)' },
                        '100%': { transform: 'translateY(0)' }
                      }
                    }}>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Fade>
          )}

          {isLoading && !streamingEnabled && !streamingMessageId && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            px: 3,
            py: 2,
            pb: 4,
            display: 'flex',
            gap: 1.5,
            alignItems: 'center',
            backgroundColor: 'transparent',
          }}
        >
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              px: 1,
              transition: 'box-shadow 0.2s ease',
              '&:focus-within': {
                boxShadow: '0 4px 20px rgba(0,113,197,0.15)',
                borderColor: 'rgba(0,113,197,0.3)',
              },
            }}
          >
          <TextField
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "Please wait..." : "Type your message..."}
            variant="standard"
            fullWidth
            disabled={isLoading}
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              px: 1.5,
              py: 1,
              '& .MuiInputBase-input': {
                fontSize: '0.95rem',
              },
            }}
          />
          <AudioRecorder 
            onTranscription={handleTranscription} 
            disabled={isLoading}
          />
          <Tooltip title="Send message" arrow>
            <IconButton
              type="submit"
              disabled={isLoading || !input.trim()}
              sx={{
                background: 'linear-gradient(135deg, #0071C5 0%, #1976d2 100%)',
                color: 'white',
                mr: 0.5,
                '&:hover': {
                  background: 'linear-gradient(135deg, #005fa3 0%, #1565c0 100%)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(0, 0, 0, 0.08)',
                  color: 'rgba(0, 0, 0, 0.26)',
                },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}