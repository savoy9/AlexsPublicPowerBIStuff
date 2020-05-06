CREATE TABLE [dbo].[PBIUsagetracking_RawData](
	[UserName] [nvarchar](50) NULL,
	[ReportName] [nvarchar](50) NULL,
	[WorkspaceName] [nvarchar](50) NULL,
	[ReportOwnerContact] [nvarchar](50) NULL,
	[PrimaryDataSource] [nvarchar](100) NULL,
	[Querytime] [smalldatetime] NULL,
	[ReportPageState] [nvarchar](50) NULL,
	[RefreshMetadata] [smalldatetime] NULL,
	[DumpFilters] [nvarchar](max) NULL,
	[OtherData] [nvarchar](max) NULL,
	[ModelRefresh] [smalldatetime] NULL
)


