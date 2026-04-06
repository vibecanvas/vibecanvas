function fxHomeFilesystem(portal: { filesystem: import('@vibecanvas/filesystem-service/IFilesystemService').IFilesystemService }): TErrTuple<{ path: string }> {
  return [{ path: portal.filesystem.homeDir() }, null];
}

export { fxHomeFilesystem };
