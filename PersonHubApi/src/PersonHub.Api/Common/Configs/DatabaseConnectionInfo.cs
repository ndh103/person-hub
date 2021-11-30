namespace PersonHub.Api.Common.Configs;

public class DatabaseConnectionInfo
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string SearchPath { get; set; } = string.Empty;
    public string Database { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public int SslMode { get; set; }
}
