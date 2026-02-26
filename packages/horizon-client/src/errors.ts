export interface HorizonErrorBody {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extras?: Record<string, unknown>;
}

export class HorizonError extends Error {
  readonly status: number;
  readonly type?: string;
  readonly title?: string;
  readonly detail?: string;
  readonly extras?: Record<string, unknown>;

  constructor(status: number, message: string, response?: HorizonErrorBody) {
    super(message);
    this.name = 'HorizonError';
    this.status = status;
    if (response) {
      this.type = response.type;
      this.title = response.title;
      this.detail = response.detail;
      this.extras = response.extras;
    }
  }
}
