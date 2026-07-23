package main

import (
	"embed"
	"log"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/service"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	cfgStore, err := config.Open(domain.AppName)
	if err != nil {
		log.Fatal(err)
	}

	db, err := storage.Open(domain.AppName)
	if err != nil {
		log.Fatal(err)
	}

	remoteMgr := service.NewRemoteManager(db)
	fileSvc := service.NewFileService(remoteMgr)
	settingsSvc := service.NewSettingsService(db, cfgStore)
	bookmarkSvc := service.NewBookmarkService(db)
	termSvc := service.NewTerminalService()
	connSvc := service.NewConnectionService(db, remoteMgr)
	updateSvc := service.NewUpdateService()

	app := application.New(application.Options{
		Name:        "Go File Manager",
		Description: "Dual-pane file manager (Double Commander style)",
		Services: []application.Service{
			application.NewService(fileSvc),
			application.NewService(settingsSvc),
			application.NewService(bookmarkSvc),
			application.NewService(termSvc),
			application.NewService(connSvc),
			application.NewService(updateSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		// Used when built with -tags server (e2e / headless).
		Server: application.ServerOptions{
			Host: "127.0.0.1",
			Port: 8080,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	termSvc.SetApp(app)

	app.OnShutdown(func() {
		_ = termSvc.Stop("left")
		_ = termSvc.Stop("right")
		remoteMgr.CloseAll()
		_ = db.Close()
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:     "Go File Manager",
		Width:     1280,
		Height:    800,
		MinWidth:  900,
		MinHeight: 500,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 0,
			Backdrop:                application.MacBackdropNormal,
			TitleBar:                application.MacTitleBarDefault,
		},
		BackgroundColour: application.NewRGB(18, 18, 18),
		URL:              "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
