/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// AWS backend URL
const AWS_BACKEND_URL = "http://agentp-Publi-bWOcL63CIdjh-1015568917.us-east-1.elb.amazonaws.com";

// Supported endpoints and their methods
const ALLOWED_ENDPOINTS = [
  { path: '/upload', methods: ['POST'] },
  { path: '/query', methods: ['POST'] },
];

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
            
            // Create a new file object from the original
            const fileBlob = new Blob([await value.arrayBuffer()], { type: value.type });
            const file = new File([fileBlob], value.name, { 
              type: value.type,
              lastModified: value.lastModified 
            });
            
            newFormData.append(key, file);
          } else {
            console.log(`- ${key}: ${value}`);
            newFormData.append(key, value);
          }
        }
        
        body = newFormData;
      } catch (error) {
        console.error('Error parsing form data:', error);
        throw new Error('Failed to parse form data');
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
        
        // Create a new form with just the file
        const directFormData = new FormData();
        directFormData.append('file', file);
        
        const response = await fetch(`${AWS_BACKEND_URL}${endpoint}`, {
          method: 'POST',
          body: directFormData,
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
    return NextResponse.json(
      { error: 'Failed to proxy request to backend service', message: (error as Error).message },
      { status: 500 }
    );
  }
}

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