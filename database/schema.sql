SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.Categories', N'U') IS NULL
BEGIN
 CREATE TABLE dbo.Categories (
  Id nvarchar(128) NOT NULL PRIMARY KEY,
  Name nvarchar(80) COLLATE Latin1_General_100_CI_AS NOT NULL UNIQUE,
  Color char(7) NOT NULL,
  SortOrder int NOT NULL DEFAULT 0
 );
 CREATE TABLE dbo.Notes (
  Id nvarchar(128) NOT NULL PRIMARY KEY,
  CategoryId nvarchar(128) NOT NULL REFERENCES dbo.Categories(Id),
  Payload nvarchar(max) NOT NULL,
  Revision int NOT NULL DEFAULT 1,
  CreatedAt datetime2(3) NOT NULL,
  UpdatedAt datetime2(3) NOT NULL,
  DeletedAt datetime2(3) NULL
 );
 CREATE INDEX IX_Notes_Category ON dbo.Notes(CategoryId);
 CREATE INDEX IX_Notes_UpdatedAt ON dbo.Notes(UpdatedAt DESC);
 CREATE TABLE dbo.NoteVersions (
  NoteId nvarchar(128) NOT NULL REFERENCES dbo.Notes(Id) ON DELETE CASCADE,
  Revision int NOT NULL,
  Payload nvarchar(max) NOT NULL,
  SavedAt datetime2(3) NOT NULL,
  CONSTRAINT PK_NoteVersions PRIMARY KEY (NoteId, Revision)
 );
 CREATE TABLE dbo.Imports (
  Hash char(64) NOT NULL PRIMARY KEY,
  ImportedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
  Added int NOT NULL,
  Skipped int NOT NULL
 );
END;
COMMIT;
