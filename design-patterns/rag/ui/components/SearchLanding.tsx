"use client"

import axios from 'axios';
import debounce from "lodash/debounce"
import type React from "react"
import { useState } from "react"
import { Search } from "lucide-react"
import {
  TextField,
  Button,
  List,
  ListItemButton,
  Typography,
  Container,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Paper,
  type SelectChangeEvent,
} from "@mui/material"
import { CircularProgress } from "@mui/material";
import { getSuggestions } from "@/lib/api"
import { type ApiType, API_TYPES } from "@/types/api"
import { CHAT_QNA_URL } from "@/lib/constants"

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_RANGE = 20

interface SearchLandingProps {
  onSearch: (results: any[], api: ApiType, query: string) => void;
}

export default function SearchLanding({ onSearch }: SearchLandingProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedApi, setSelectedApi] = useState<ApiType>("semantic_scholar")
  const [selectedYear, setSelectedYear] = useState<number | 0>(0)
  const [isLoading, setIsLoading] = useState(false)

  const years = Array.from({ length: YEAR_RANGE }, (_, i) => CURRENT_YEAR - i)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsLoading(true);
      try {
        const response = await axios.post(`${CHAT_QNA_URL}/api/search_papers`, {
          query,
          year: selectedYear,
          api: selectedApi,
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });
        onSearch(response.data.papers, selectedApi, query);
      } catch (error) {
        console.error('Error searching papers:', error);
        setError('Failed to search papers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const fetchSuggestions = debounce(async (value: string) => {
    if (value.length >= 3) {
      try {
        setIsLoading(true)
        const { suggestions } = await getSuggestions(value, selectedApi)
        setSuggestions(suggestions)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        setError("Failed to fetch suggestions. Please try again.")
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    } else {
      setSuggestions([])
    }
  }, 300)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setError(null)
    fetchSuggestions(value)
  }

  const handleApiChange = (event: SelectChangeEvent<ApiType>) => {
    const value = event.target.value as ApiType
    setSelectedApi(value)
  }

  return (
    <Box
      sx={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        background: 'linear-gradient(103deg, #2155BF 0%, #29D9FF 100.37%)',
        pt: { xs: 10, md: 16 },
        pb: { xs: 4, md: 8 },
        px: 2,
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 800,
            mx: "auto",
          }}
        >
          <Typography
            variant="h5"
            align="center"
            sx={{
              fontWeight: 400,
              mb: 2,
              fontSize: { xs: "1.25rem", md: "1.5rem" },
              color: "#ffffff",
              fontStyle: "italic",
              width: "100%",
              textAlign: "center",
              position: "relative",
              cursor: "default"
            }}
          >
            {" Discover and explore academic papers."}
          </Typography>
          <Box
            component="form"
            onSubmit={handleSearch}
            noValidate
            sx={{
              width: "100%",
              backdropFilter: "blur(8px)",
              borderRadius: 2,
              p: { xs: 2, md: 3 },
              backgroundColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <Select
                    value={selectedApi}
                    onChange={handleApiChange}
                    displayEmpty
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 1)",
                      },
                    }}
                  >
                    <MenuItem value="">
                      <em>Select API</em>
                    </MenuItem>
                    {API_TYPES.map((api) => (
                      <MenuItem key={api} value={api}>
                        {api.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <Select
                    displayEmpty
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value as number | 0)}
                    sx={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 1)",
                      },
                    }}
                  >
                    <MenuItem value={0}>
                      <em>Select Publication Year</em>
                    </MenuItem>
                    {years.map((year) => (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Box sx={{ position: "relative" }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search for research papers..."
                value={query}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isLoading}
                      sx={{
                        borderRadius: "0 4px 4px 0",
                        height: "100%",
                        minWidth: "56px",
                        backgroundColor: "#0071c5",
                        "&:hover": {
                          backgroundColor: "#004f8a",
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} color="inherit" /> : <Search />}
                    </Button>
                  ),
                }}
                sx={{
                  backgroundColor: "rgba(255, 255, 255, 0.9)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 1)",
                  },
                  borderRadius: "4px",
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "transparent",
                    },
                    "&:hover fieldset": {
                      borderColor: "transparent",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#0071c5",
                    },
                  },
                }}
              />

              {suggestions.length > 0 && (
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
                          setQuery(suggestion)
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

            {error && <Typography sx={{ mt: 2, color: "#ff3d00" }}>{error}</Typography>}
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
