package main

import (
	"os"

	"github.com/daniilsv/buildctl-cli/cmd/commands"
)

func main() {
	if err := commands.Execute(); err != nil {
		os.Exit(1)
	}
}
