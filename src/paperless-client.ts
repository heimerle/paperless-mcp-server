import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface PaperlessDocument {
  id: number;
  title?: string;
  content?: string;
  correspondent?: {
    id: number;
    name: string;
  };
  document_type?: {
    id: number;
    name: string;
  };
  tags?: Array<{
    id: number;
    name: string;
    color?: string;
  }>;
  created: string;
  modified: string;
  added: string;
  archive_serial_number?: string;
  original_file_name: string;
  checksum: string;
}

export interface PaperlessSearchResponse {
  count: number;
  next?: string;
  previous?: string;
  results: PaperlessDocument[];
}

export interface PaperlessTag {
  id: number;
  name: string;
  color?: string;
  text_color?: string;
}

export interface PaperlessCorrespondent {
  id: number;
  name: string;
}

export interface PaperlessDocumentType {
  id: number;
  name: string;
}

export interface SearchDocumentsParams {
  query?: string | undefined;
  limit?: number | undefined;
  ordering?: string | undefined;
  document_type?: number | undefined;
  correspondent?: number | undefined;
  tags?: number[] | undefined;
}

export interface CreateTagParams {
  name: string;
  color?: string | undefined;
  text_color?: string | undefined;
}

export interface CreateCorrespondentParams {
  name: string;
}

export interface CreateDocumentTypeParams {
  name: string;
}

export interface UpdateDocumentParams {
  title?: string | undefined;
  correspondent?: number | undefined;
  document_type?: number | undefined;
  tags?: number[] | undefined;
  archive_serial_number?: string | undefined;
}

export interface BulkUpdateDocumentItem {
  id: number;
  title?: string | undefined;
  correspondent?: number | undefined;
  document_type?: number | undefined;
  tags?: number[] | undefined;
  archive_serial_number?: string | undefined;
}

export interface BulkUpdateParams {
  documents: BulkUpdateDocumentItem[];
}

export interface BulkUpdateResponse {
  updated_count: number;
  failed_updates: Array<{
    id: number;
    error: string;
  }>;
}

export class PaperlessClient {
  private client: AxiosInstance;

  constructor(baseURL: string, token: string) {
    this.client = axios.create({
      baseURL: baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL,
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async searchDocuments(params: SearchDocumentsParams = {}): Promise<PaperlessSearchResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.append('query', params.query);
    if (params.limit) searchParams.append('page_size', params.limit.toString());
    if (params.ordering) searchParams.append('ordering', params.ordering);
    if (params.document_type) searchParams.append('document_type__id', params.document_type.toString());
    if (params.correspondent) searchParams.append('correspondent__id', params.correspondent.toString());
    if (params.tags) {
      params.tags.forEach(tag => searchParams.append('tags__id__in', tag.toString()));
    }

    const response: AxiosResponse<PaperlessSearchResponse> = await this.client.get('/api/documents/', {
      params: searchParams,
    });

    return response.data;
  }

  async getDocument(documentId: number): Promise<PaperlessDocument> {
    const response: AxiosResponse<PaperlessDocument> = await this.client.get(`/api/documents/${documentId}/`);
    return response.data;
  }

  async getDocumentContent(documentId: number): Promise<string> {
    try {
      const response: AxiosResponse<string> = await this.client.get(`/api/documents/${documentId}/content/`, {
        headers: {
          'Accept': 'text/plain',
        },
      });
      return response.data;
    } catch (error) {
      // If content endpoint fails, try to get from document metadata
      console.error(`Failed to get content for document ${documentId}:`, error);
      const document = await this.getDocument(documentId);
      return document.content || 'Content not available';
    }
  }

  async updateDocument(documentId: number, updates: UpdateDocumentParams): Promise<PaperlessDocument> {
    const response: AxiosResponse<PaperlessDocument> = await this.client.patch(`/api/documents/${documentId}/`, updates);
    return response.data;
  }

  async bulkUpdateDocuments(updates: BulkUpdateParams): Promise<BulkUpdateResponse> {
    // Paperless-ngx doesn't have a native bulk update API, so we'll implement it client-side
    // by making individual PATCH requests in parallel
    const results = await Promise.allSettled(
      updates.documents.map(async (doc) => {
        const { id, ...updateData } = doc;
        return await this.updateDocument(id, updateData);
      })
    );

    const failed_updates: Array<{ id: number; error: string }> = [];
    let updated_count = 0;

    results.forEach((result, index) => {
      const docId = updates.documents[index]!.id;
      if (result.status === 'fulfilled') {
        updated_count++;
      } else {
        failed_updates.push({
          id: docId,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    return {
      updated_count,
      failed_updates
    };
  }

  async listTags(): Promise<PaperlessTag[]> {
    const response: AxiosResponse<{ results: PaperlessTag[] }> = await this.client.get('/api/tags/');
    return response.data.results;
  }

  async listCorrespondents(): Promise<PaperlessCorrespondent[]> {
    const response: AxiosResponse<{ results: PaperlessCorrespondent[] }> = await this.client.get('/api/correspondents/');
    return response.data.results;
  }

  async listDocumentTypes(): Promise<PaperlessDocumentType[]> {
    const response: AxiosResponse<{ results: PaperlessDocumentType[] }> = await this.client.get('/api/document_types/');
    return response.data.results;
  }

  async createTag(tagData: CreateTagParams): Promise<PaperlessTag> {
    const response: AxiosResponse<PaperlessTag> = await this.client.post('/api/tags/', tagData);
    return response.data;
  }

  async createCorrespondent(correspondentData: CreateCorrespondentParams): Promise<PaperlessCorrespondent> {
    const response: AxiosResponse<PaperlessCorrespondent> = await this.client.post('/api/correspondents/', correspondentData);
    return response.data;
  }

  async createDocumentType(documentTypeData: CreateDocumentTypeParams): Promise<PaperlessDocumentType> {
    const response: AxiosResponse<PaperlessDocumentType> = await this.client.post('/api/document_types/', documentTypeData);
    return response.data;
  }

  async getDownloadUrl(documentId: number): Promise<string> {
    // Return the download URL - the client will need to add auth headers when accessing it
    return `${this.client.defaults.baseURL}/api/documents/${documentId}/download/`;
  }
}