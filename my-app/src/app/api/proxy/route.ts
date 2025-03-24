/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// AWS backend URL
const AWS_BACKEND_URL = "http://agentp-Publi-bWOcL63CIdjh-1015568917.us-east-1.elb.amazonaws.com";

// Supported endpoints and their methods
const ALLOWED_ENDPOINTS = [
  { path: '/upload', methods: ['POST'] },
  { path: '/query', methods: ['POST'] },
];

// Maximum file size in bytes (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Generic proxy handler that forwards requests to the AWS backend
 */
async function proxyRequest(request: NextRequest, endpoint: string) {
  try {
    console.log(`Proxying request to ${endpoint}...`);
    
    // Get the request body if it exists
    let body;
    const contentType = request.headers.get('content-type') || '';
    console.log(`Content-Type: ${contentType}`);
    
    // Special handling for multipart form data (file uploads)
    if (contentType.includes('multipart/form-data')) {
      console.log('Handling multipart form data...');
      try {
        const formData = await request.formData();
        
        // Create a new FormData object that will be better compatible with fetch
        const newFormData = new FormData();
        
        // Log what we received
        console.log('Form data entries:');
        for (const [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`- ${key}: File (${value.name}, ${value.size} bytes, ${value.type})`);
            
            // Check file size
            if (value.size > MAX_FILE_SIZE) {
              console.error(`File too large: ${value.size} bytes (max: ${MAX_FILE_SIZE} bytes)`);
              throw new Error(`File size exceeds the maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
            }
            
            // Create a new file object from the original
            const fileBlob = new Blob([await value.arrayBuffer()], { type: value.type });
            const file = new File([fileBlob], value.name, { 
              type: value.type,
              lastModified: value.lastModified 
            });
            
            newFormData.append(key, file);
            console.log(`Successfully processed file: ${value.name}`);
          } else {
            console.log(`- ${key}: ${value}`);
            newFormData.append(key, value);
          }
        }
        
        body = newFormData;
      } catch (error) {
        console.error('Error parsing form data:', error);
        if ((error as Error).message.includes('File size exceeds')) {
          return NextResponse.json(
            { error: 'File too large', message: (error as Error).message },
            { status: 413 }
          );
        }
        throw new Error('Failed to parse form data: ' + (error as Error).message);
      }
    } else if (contentType.includes('application/json')) {
      console.log('Handling JSON data...');
      body = await request.json();
      console.log('Request body:', JSON.stringify(body).substring(0, 200) + '...');
    } else {
      console.log('Handling text/plain data...');
      const text = await request.text();
      body = text.length > 0 ? text : undefined;
      if (body) {
        console.log('Request body (text):', body.substring(0, 200) + '...');
      }
    }
    
    // For file uploads, don't forward the original content-type header
    // Let the browser set it with the correct boundary
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      // Skip host header and content-type for multipart/form-data
      if (key !== 'host' && !(contentType.includes('multipart/form-data') && key === 'content-type')) {
        headers.append(key, value);
      }
    });
    
    console.log(`Sending ${request.method} request to ${AWS_BACKEND_URL}${endpoint}`);
    
    // Special case for file uploads - use a more direct approach
    if (endpoint === '/upload' && body instanceof FormData) {
      console.log('Using direct file upload approach');
      
      // Make the request to the backend using Blob and ArrayBuffer for better compatibility
      try {
        const file = body.get('file') as File;
        if (!file) {
          throw new Error('No file found in the form data');
        }
        
        console.log(`Uploading file: ${file.name} (${file.size} bytes)`);
        
        // Create a new form with just the file
        const directFormData = new FormData();
        directFormData.append('file', file);
        
        // Set a timeout for large files
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

        try {
          const response = await fetch(`${AWS_BACKEND_URL}${endpoint}`, {
            method: 'POST',
            body: directFormData,
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          console.log(`Backend responded with status: ${response.status}`);
          
          if (!response.ok) {
            let errorText;
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = 'Could not read error response';
            }
            
            console.error(`Backend error (${response.status}):`, errorText);
            return NextResponse.json(
              { error: 'Backend service returned an error', details: errorText },
              { status: response.status }
            );
          }
          
          // Get the response data
          const responseData = await response.json();
          console.log('Response data:', JSON.stringify(responseData).substring(0, 200) + '...');
          
          // Return the proxied response
          return NextResponse.json(responseData, {
            status: response.status,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          clearTimeout(timeoutId);
          if ((error as any).name === 'AbortError') {
            console.error('Upload request timed out');
            return NextResponse.json(
              { error: 'Upload timed out', message: 'The upload took too long and was aborted' },
              { status: 504 }
            );
          }
          throw error;
        }
      } catch (error) {
        console.error('File upload error:', error);
        throw error;
      }
    } else {
      // Standard request handling for non-file uploads
      const response = await fetch(`${AWS_BACKEND_URL}${endpoint}`, {
        method: request.method,
        headers,
        body: body instanceof FormData ? body : 
              typeof body === 'string' ? body : 
              body ? JSON.stringify(body) : undefined,
      });
      
      console.log(`Backend responded with status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Backend error (${response.status}):`, errorText);
        return NextResponse.json(
          { error: 'Backend service returned an error', details: errorText },
          { status: response.status }
        );
      }
      
      // Get the response data
      let responseData;
      const responseContentType = response.headers.get('content-type') || '';
      
      if (responseContentType.includes('application/json')) {
        responseData = await response.json();
        console.log('Response data:', JSON.stringify(responseData).substring(0, 200) + '...');
      } else {
        responseData = await response.text();
        console.log('Response text:', responseData.substring(0, 200) + '...');
      }
      
      // Return the proxied response
      return NextResponse.json(responseData, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    // Check if this is a size-related error
    const errorMessage = (error as Error).message;
    if (errorMessage.includes('size limit') || errorMessage.includes('too large')) {
      return NextResponse.json(
        { error: 'Request too large', message: errorMessage },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to proxy request to backend service', message: errorMessage },
      { status: 500 }
    );
  }
}

// Export config to increase body size limit
export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: false // Turn off built-in bodyParser so we can handle form data manually
  },
};

// This defines the maximum size for Next.js API routes - match the free tier
export const maxDuration = 10; // 10 seconds (free tier limit)

export async function POST(request: NextRequest) {
  // Extract the target endpoint from the URL
  const url = new URL(request.url);
  const endpoint = url.searchParams.get('endpoint') || '';
  
  console.log(`Received proxy request for endpoint: ${endpoint}`);
  
  // Check if endpoint is allowed
  const allowedEndpoint = ALLOWED_ENDPOINTS.find(e => 
    e.path === endpoint && e.methods.includes('POST')
  );
  
  if (!allowedEndpoint) {
    console.error(`Endpoint not allowed: ${endpoint}`);
    return NextResponse.json(
      { error: `Endpoint ${endpoint} not allowed or method not supported` },
      { status: 404 }
    );
  }
  
  return proxyRequest(request, endpoint);
}

export async function GET(request: NextRequest) {
  // For any GET requests to the proxy
  console.log('Received health check request to proxy');
  return NextResponse.json({ message: 'Proxy service is running' }, { status: 200 });
} 