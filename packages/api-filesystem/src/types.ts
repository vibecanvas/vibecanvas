import type { IFilesystemService } from '@vibecanvas/service-filesystem/IFilesystemService';

type TFilesystemApiContext = {
  filesystem: IFilesystemService;
  requestId?: string;
};

export type { TFilesystemApiContext };
