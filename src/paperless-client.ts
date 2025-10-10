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

export interface PaperlessStoragePath {
  id: number;
  name: string;
  path: string;
  match?: string;
  matching_algorithm?: number;
}

export interface PaperlessCustomField {
  id: number;
  name: string;
  data_type: 'string' | 'url' | 'date' | 'boolean' | 'integer' | 'float' | 'monetary';
}

export interface PaperlessSavedView {
  id: number;
  name: string;
  show_on_dashboard: boolean;
  show_in_sidebar: boolean;
  sort_field?: string;
  sort_reverse?: boolean;
  filter_rules?: any[];
}

export interface PaperlessTask {
  id: number;
  task_id: string;
  task_file_name?: string;
  date_created: string;
  date_done?: string;
  type: string;
  status: string;
  result?: string;
  acknowledged: boolean;
  related_document?: string;
}

export interface PaperlessStatistics {
  documents_total: number;
  documents_inbox: number;
  document_file_type_counts: Array<{ file_type: string; count: number }>;
  character_count: number;
  tag_count: number;
  correspondent_count: number;
  document_type_count: number;
  inbox_tag?: { id: number; name: string };
}

export interface CreateStoragePathParams {
  name: string;
  path: string;
  match?: string;
  matching_algorithm?: number;
}

export interface CreateCustomFieldParams {
  name: string;
  data_type: 'string' | 'url' | 'date' | 'boolean' | 'integer' | 'float' | 'monetary';
}

export interface CreateSavedViewParams {
  name: string;
  show_on_dashboard?: boolean;
  show_in_sidebar?: boolean;
  sort_field?: string;
  sort_reverse?: boolean;
  filter_rules?: any[];
}

export interface UploadDocumentParams {
  file: Buffer;
  filename: string;
  title?: string;
  correspondent?: number;
  document_type?: number;
  tags?: number[];
  created?: string;
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

  // Document Operations
  async deleteDocument(documentId: number): Promise<void> {
    await this.client.delete(`/api/documents/${documentId}/`);
  }

  async uploadDocument(params: UploadDocumentParams): Promise<{ task_id: string }> {
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('document', params.file, params.filename);
    if (params.title) formData.append('title', params.title);
    if (params.correspondent) formData.append('correspondent', params.correspondent.toString());
    if (params.document_type) formData.append('document_type', params.document_type.toString());
    if (params.tags) formData.append('tags', params.tags.join(','));
    if (params.created) formData.append('created', params.created);

    const response: AxiosResponse<{ task_id: string }> = await this.client.post('/api/documents/post_document/', formData, {
      headers: formData.getHeaders(),
    });
    return response.data;
  }

  async getDocumentSuggestions(documentId: number): Promise<any> {
    const response = await this.client.get(`/api/documents/${documentId}/suggestions/`);
    return response.data;
  }

  async getDocumentMetadata(documentId: number): Promise<any> {
    const response = await this.client.get(`/api/documents/${documentId}/metadata/`);
    return response.data;
  }

  // Storage Paths
  async listStoragePaths(): Promise<PaperlessStoragePath[]> {
    const response: AxiosResponse<{ results: PaperlessStoragePath[] }> = await this.client.get('/api/storage_paths/');
    return response.data.results;
  }

  async getStoragePath(storagePathId: number): Promise<PaperlessStoragePath> {
    const response: AxiosResponse<PaperlessStoragePath> = await this.client.get(`/api/storage_paths/${storagePathId}/`);
    return response.data;
  }

  async createStoragePath(data: CreateStoragePathParams): Promise<PaperlessStoragePath> {
    const response: AxiosResponse<PaperlessStoragePath> = await this.client.post('/api/storage_paths/', data);
    return response.data;
  }

  async updateStoragePath(storagePathId: number, data: Partial<CreateStoragePathParams>): Promise<PaperlessStoragePath> {
    const response: AxiosResponse<PaperlessStoragePath> = await this.client.patch(`/api/storage_paths/${storagePathId}/`, data);
    return response.data;
  }

  async deleteStoragePath(storagePathId: number): Promise<void> {
    await this.client.delete(`/api/storage_paths/${storagePathId}/`);
  }

  // Custom Fields
  async listCustomFields(): Promise<PaperlessCustomField[]> {
    const response: AxiosResponse<{ results: PaperlessCustomField[] }> = await this.client.get('/api/custom_fields/');
    return response.data.results;
  }

  async getCustomField(customFieldId: number): Promise<PaperlessCustomField> {
    const response: AxiosResponse<PaperlessCustomField> = await this.client.get(`/api/custom_fields/${customFieldId}/`);
    return response.data;
  }

  async createCustomField(data: CreateCustomFieldParams): Promise<PaperlessCustomField> {
    const response: AxiosResponse<PaperlessCustomField> = await this.client.post('/api/custom_fields/', data);
    return response.data;
  }

  async updateCustomField(customFieldId: number, data: Partial<CreateCustomFieldParams>): Promise<PaperlessCustomField> {
    const response: AxiosResponse<PaperlessCustomField> = await this.client.patch(`/api/custom_fields/${customFieldId}/`, data);
    return response.data;
  }

  async deleteCustomField(customFieldId: number): Promise<void> {
    await this.client.delete(`/api/custom_fields/${customFieldId}/`);
  }

  // Saved Views
  async listSavedViews(): Promise<PaperlessSavedView[]> {
    const response: AxiosResponse<{ results: PaperlessSavedView[] }> = await this.client.get('/api/saved_views/');
    return response.data.results;
  }

  async getSavedView(savedViewId: number): Promise<PaperlessSavedView> {
    const response: AxiosResponse<PaperlessSavedView> = await this.client.get(`/api/saved_views/${savedViewId}/`);
    return response.data;
  }

  async createSavedView(data: CreateSavedViewParams): Promise<PaperlessSavedView> {
    const response: AxiosResponse<PaperlessSavedView> = await this.client.post('/api/saved_views/', data);
    return response.data;
  }

  async updateSavedView(savedViewId: number, data: Partial<CreateSavedViewParams>): Promise<PaperlessSavedView> {
    const response: AxiosResponse<PaperlessSavedView> = await this.client.patch(`/api/saved_views/${savedViewId}/`, data);
    return response.data;
  }

  async deleteSavedView(savedViewId: number): Promise<void> {
    await this.client.delete(`/api/saved_views/${savedViewId}/`);
  }

  // Tags CRUD (update & delete missing)
  async getTag(tagId: number): Promise<PaperlessTag> {
    const response: AxiosResponse<PaperlessTag> = await this.client.get(`/api/tags/${tagId}/`);
    return response.data;
  }

  async updateTag(tagId: number, data: Partial<CreateTagParams>): Promise<PaperlessTag> {
    const response: AxiosResponse<PaperlessTag> = await this.client.patch(`/api/tags/${tagId}/`, data);
    return response.data;
  }

  async deleteTag(tagId: number): Promise<void> {
    await this.client.delete(`/api/tags/${tagId}/`);
  }

  // Correspondents CRUD (update & delete missing)
  async getCorrespondent(correspondentId: number): Promise<PaperlessCorrespondent> {
    const response: AxiosResponse<PaperlessCorrespondent> = await this.client.get(`/api/correspondents/${correspondentId}/`);
    return response.data;
  }

  async updateCorrespondent(correspondentId: number, data: Partial<CreateCorrespondentParams>): Promise<PaperlessCorrespondent> {
    const response: AxiosResponse<PaperlessCorrespondent> = await this.client.patch(`/api/correspondents/${correspondentId}/`, data);
    return response.data;
  }

  async deleteCorrespondent(correspondentId: number): Promise<void> {
    await this.client.delete(`/api/correspondents/${correspondentId}/`);
  }

  // Document Types CRUD (update & delete missing)
  async getDocumentType(documentTypeId: number): Promise<PaperlessDocumentType> {
    const response: AxiosResponse<PaperlessDocumentType> = await this.client.get(`/api/document_types/${documentTypeId}/`);
    return response.data;
  }

  async updateDocumentType(documentTypeId: number, data: Partial<CreateDocumentTypeParams>): Promise<PaperlessDocumentType> {
    const response: AxiosResponse<PaperlessDocumentType> = await this.client.patch(`/api/document_types/${documentTypeId}/`, data);
    return response.data;
  }

  async deleteDocumentType(documentTypeId: number): Promise<void> {
    await this.client.delete(`/api/document_types/${documentTypeId}/`);
  }

  // Tasks
  async listTasks(): Promise<PaperlessTask[]> {
    const response: AxiosResponse<{ results: PaperlessTask[] }> = await this.client.get('/api/tasks/');
    return response.data.results;
  }

  async acknowledgeTask(taskId: number): Promise<void> {
    await this.client.post(`/api/tasks/${taskId}/acknowledge/`);
  }

  // Statistics
  async getStatistics(): Promise<PaperlessStatistics> {
    const response: AxiosResponse<PaperlessStatistics> = await this.client.get('/api/statistics/');
    return response.data;
  }

  // Logs
  async getLogs(): Promise<string[]> {
    const response: AxiosResponse<string[]> = await this.client.get('/api/logs/');
    return response.data;
  }
}