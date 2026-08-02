package main

import (
	"embed"
	"log"
	"path/filepath"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/service"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
	"github.com/erikharutyunyan/go-file-manager/internal/version"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
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
	fileSvc := service.NewFileService(remoteMgr, filepath.Join(cfgStore.Dir(), "trash"))
	if err := fileSvc.PurgeTrash(); err != nil {
		log.Printf("purge trash: %v", err)
	}
	settingsSvc := service.NewSettingsService(db, cfgStore)
	bookmarkSvc := service.NewBookmarkService(db)
	termSvc := service.NewTerminalService(remoteMgr)
	connSvc := service.NewConnectionService(db, remoteMgr)
	updateSvc := service.NewUpdateService()
	gitSvc := service.NewGitService()

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
			application.NewService(gitSvc),
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

	gh, err := github.New(github.Config{
		Repository:    "braniubojni/go-file-manager",
		ChecksumAsset: "SHA256SUMS",
	})
	if err != nil {
		log.Fatalf("github updater provider: %v", err)
	}
	if err := app.Updater.Init(updater.Config{
		CurrentVersion: service.CurrentVersionForUpdater(version.Version),
		Providers:      []updater.Provider{gh},
	}); err != nil {
		log.Fatalf("Updater.Init: %v", err)
	}

	termSvc.SetApp(app)
	fileSvc.SetApp(app)
	service.AttachUpdateApp(updateSvc, app)

	app.OnShutdown(func() {
		_ = termSvc.Stop("left")
		_ = termSvc.Stop("right")
		remoteMgr.CloseAll()
		_ = db.Close()
	})

	win := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:          "Go File Manager",
		Width:          1280,
		Height:         800,
		MinWidth:       900,
		MinHeight:      500,
		EnableFileDrop: true,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 0,
			Backdrop:                application.MacBackdropNormal,
			TitleBar:                application.MacTitleBarDefault,
		},
		BackgroundColour: application.NewRGB(18, 18, 18),
		URL:              "/",
	})

	// OS file manager → app (Finder / Explorer / Linux FMs). Frontend marks
	// panes and folder rows with data-file-drop-target; drop is forwarded as
	// a custom event so the UI can copy into the resolved destination.
	win.OnWindowEvent(events.Common.WindowFilesDropped, func(event *application.WindowEvent) {
		files := event.Context().DroppedFiles()
		if len(files) == 0 {
			return
		}
		payload := map[string]any{"files": files}
		if details := event.Context().DropTargetDetails(); details != nil {
			payload["target"] = map[string]any{
				"id":         details.ElementID,
				"classList":  details.ClassList,
				"attributes": details.Attributes,
				"x":          details.X,
				"y":          details.Y,
			}
		}
		app.Event.Emit("files-dropped", payload)
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
