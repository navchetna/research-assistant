"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { ArrowLeft, Download, Search, ChevronDown, ChevronUp } from "lucide-react"
import {
  Typography,
  Button,
  Box,
  Container,
  CircularProgress,
  Alert,
  TextField,
  Collapse,
  List,
  ListItemButton,
  Paper,
} from "@mui/material"
import { type PaperResult, type ApiType } from "@/types/api"
import { getSuggestions } from "@/lib/api"
import { CHAT_QNA_URL } from "@/lib/constants"
import axios from "axios"
import debounce from "lodash/debounce"

interface SearchResultsProps {
  results: any[];
  api: ApiType;
  query: string;
  onSearch: (results: any[], api: ApiType, query: string) => void;
}

export default function SearchResults({ results, api, query, onSearch }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const [papers, setPapers] = useState<PaperResult[]>(results);
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>(query)
  const [displayedQuery, setDisplayedQuery] = useState<string>(query)
  const [expandedSnippets, setExpandedSnippets] = useState<{ [key: string]: boolean }>({})
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    const q = searchParams.get("q") || ""
    setSearchQuery(q)
  }, [searchParams])

  useEffect(() => {
    setPapers(results);
  }, [results]);

  const fetchSuggestions = debounce(async (value: string) => {
    if (value.length >= 3) {
      try {
        const { suggestions } = await getSuggestions(value, api)
        setSuggestions(suggestions)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setError("Failed to fetch suggestions. Please try again.")
        setSuggestions([])
      }
    } else {
      setSuggestions([])
    }
  }, 300)


  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setLoading(true)
      try {
        const response = await axios.post(`${CHAT_QNA_URL}/api/search_papers`, {
          query: searchQuery,
          api: api,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        setPapers(response.data.papers);
        setDisplayedQuery(searchQuery);
      } catch (error) {
        console.error('Error searching papers:', error);
        setError('Failed to search papers. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }

  const handleDownloadReferences = async (paperId: string) => {
    try {
      const response = await axios.post(`${CHAT_QNA_URL}/api/download_references`,
        {
          paper_id: paperId,
          api: api
        },
        {
          responseType: 'blob',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `references-${paperId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading references:", error);
      setError("Failed to download references. Please try again.");
    }
  };

  const toggleSnippet = (paperId: string) => {
    setExpandedSnippets(prev => ({
      ...prev,
      [paperId]: !prev[paperId]
    }))
  }

  const isSnippetTruncated = (snippet: string | null): boolean => {
    if (!snippet) return false;
    return snippet.length > 300;
  }

  return (
    <Box className="min-h-screen flex flex-col bg-white" sx={{ height: 'calc(100vh - 64px)', overflow: 'auto' }}>
      <Container maxWidth="lg" sx={{ paddingLeft: 4, paddingRight: 4, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="h6"
          component="h1"
          gutterBottom
          sx={{ fontWeight: 500, color: "#000000", mt: 4 }}
        >
          Search Results for "{displayedQuery}"
        </Typography>


        <Box component="form" onSubmit={handleSearch} noValidate sx={{ mb: 4, position: 'relative' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search for research papers..."
            value={searchQuery}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200)
            }}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              fetchSuggestions(e.target.value)
            }}


            InputProps={{
              endAdornment: (
                <Button type="submit" variant="contained" sx={{ borderRadius: "0 4px 4px 0" }}>
                  <Search />
                </Button>
              ),
            }}
            sx={{
              backgroundColor: "white",
              borderRadius: "4px",
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: "#dfe1e5",
                },
                "&:hover fieldset": {
                  borderColor: "#dfe1e5",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#4d90fe",
                },
              },
            }}
          />
          {suggestions.length > 0 && isFocused && (
            <Paper
              elevation={3}
              sx={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 1000,
                mt: 0.5,
                maxHeight: "300px",
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: "4px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              <List disablePadding>
                {suggestions.map((suggestion, index) => (
                  <ListItemButton
                    key={index}
                    onClick={() => {
                      setSearchQuery(suggestion)
                      setSuggestions([])
                    }}
                    sx={{
                      py: 1.5,
                      px: 2,
                      "&:hover": {
                        backgroundColor: "rgba(0, 113, 197, 0.08)",
                      },
                      borderBottom: index < suggestions.length - 1 ? "1px solid rgba(0, 0, 0, 0.08)" : "none",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "text.primary",
                        fontSize: "0.95rem",
                        width: "100%",
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {suggestion}
                    </Typography>
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center">
            <CircularProgress sx={{ color: "white" }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : papers && papers.length > 0 ? (
          <Box
            sx={{
              border: '1px solid #e0e0e0',
              borderRadius: 2,
              padding: 3,
              backgroundColor: 'white'
            }}
          >
            {papers.map((paper, index) => {
              const paperId = paper.url.split('/').pop() || '';
              const isExpanded = expandedSnippets[paperId];
              const shouldShowReadMore = isSnippetTruncated(paper.snippet);

              return (
                <Box key={index} sx={{ mb: 3, pb: 3, borderBottom: index < papers.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                  <Typography variant="h6" component="h2" gutterBottom sx={{ fontWeight: 500 }}>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1a0dab", textDecoration: "none" }}
                    >
                      {paper.title}
                    </a>
                  </Typography>

                  {paper.snippet ? (
                    <Box>
                      <Collapse in={isExpanded} collapsedSize={60}>
                        <Typography variant="body2" color="text.secondary">
                          {paper.snippet}
                        </Typography>
                      </Collapse>
                      {shouldShowReadMore && (
                        <Button
                          onClick={() => toggleSnippet(paperId)}
                          startIcon={isExpanded ? <ChevronUp /> : <ChevronDown />}
                          sx={{ mt: 1, color: "#006621", textTransform: 'none' }}
                        >
                          {isExpanded ? "Show Less" : "Read More"}
                        </Button>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No abstract available
                    </Typography>
                  )}

                  <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                    <Button
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontWeight: 500, color: "#006621" }}
                    >
                      Read Paper
                    </Button>
                    <Box display="flex" gap={1} alignItems="center">
                      {api === "semantic_scholar" && <Button
                        startIcon={<Download />}
                        onClick={() => paperId && handleDownloadReferences(paperId)}
                        sx={{ fontWeight: 500, color: "#006621" }}
                      >
                        Download References
                      </Button>}
                      <Button
                        startIcon={<Download size={16} />}
                        onClick={() => {}}
                        sx={{ fontWeight: 500, color: "#006621", fontSize: '0.8rem' }}
                      >
                        Download Paper
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography sx={{ color: "black" }}>No results found.</Typography>
        )}
      </Container>
    </Box>
  )
}