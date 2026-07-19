package main

import (
	"embed"
	"log"

	"github.com/erikharutyunyan/go-file-manager/internal/service"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	db, err := storage.Open("go-file-manager")
	if err != nil {
		log.Fatal(err)
	}

	fileSvc := service.NewFileService()
	settingsSvc := service.NewSettingsService(db)
	bookmarkSvc := service.NewBookmarkService(db)

	app := application.New(application.Options{
		Name:        "go-file-manager",
		Description: "Dual-pane file manager (Double Commander style)",
		Services: []application.Service{
			application.NewService(fileSvc),
			application.NewService(settingsSvc),
			application.NewService(bookmarkSvc),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.OnShutdown(func() {
		_ = db.Close()
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Go File Manager",
		Width:  1280,
		Height: 800,
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
