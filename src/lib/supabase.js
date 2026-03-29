import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zeypthsdstspsnezpzsx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleXB0aHNkc3RzcHNuZXpwenN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MzU1NzIsImV4cCI6MjA4OTExMTU3Mn0.ud_UMzmSZSUIO7mG7NTCiLPCIa6jQDV7RR-rn18wiqw'

const isConfigured = SUPABASE_URL.includes('supabase.co')

let sb = null
if (isConfigured) {
  try {
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (e) {
    console.error('Erro ao criar client Supabase:', e)
  }
}

export { sb, isConfigured }
