export interface TaskImage {
  id: string;
  task_id: string;
  data: Uint8Array;
  mime_type: string;
  file_name: string;
  created_at: string;
}

export interface TaskImageMeta {
  id: string;
  task_id: string;
  mime_type: string;
  file_name: string;
  created_at: string;
}

export interface CreateTaskImageInput {
  task_id: string;
  data: Uint8Array;
  mime_type: string;
  file_name: string;
}
