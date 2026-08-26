package remote

import "github.com/pkg/sftp"

func sftpClientOpts() []sftp.ClientOption {
	return []sftp.ClientOption{sftp.UseConcurrentWrites(true)}
}
